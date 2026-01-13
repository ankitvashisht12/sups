import 'dotenv/config';
import Bolt from '@slack/bolt';
import { env } from './config/env.js';
import {
  handleDirectMessage,
  handleAppMention,
  storeInstallation,
  fetchInstallation,
  deleteInstallation,
} from './handlers/index.js';
import {
  getWorkspacesToRemind,
  getWorkspacesAtDeadline,
  getUsersWhoSubmitted,
  getOrCreateTodayReminder,
  markReminderSent,
} from './services/reminder-service.js';
import {
  getStandupsForDate,
  aggregateUserStandups,
  markAsPosted,
} from './services/standup-service.js';

const { App, ExpressReceiver } = Bolt;

// Create Express receiver (has built-in Express server)
const receiver = new ExpressReceiver({
  signingSecret: env.SLACK_SIGNING_SECRET,
  clientId: env.SLACK_CLIENT_ID,
  clientSecret: env.SLACK_CLIENT_SECRET,
  stateSecret: 'sups-state-secret',
  scopes: [
    'app_mentions:read',
    'channels:read',
    'chat:write',
    'im:history',
    'im:read',
    'im:write',
    'users:read',
  ],
  installationStore: {
    storeInstallation,
    fetchInstallation,
    deleteInstallation,
  },
  installerOptions: {
    directInstall: true,
  },
});

// Create Bolt app
const app = new App({
  receiver,
});

// Register event handlers
app.event('message', async (args) => {
  // Only handle DMs
  if (args.event.channel_type === 'im') {
    await handleDirectMessage(args);
  }
});

app.event('app_mention', handleAppMention);

// Handle app uninstall
app.event('app_uninstalled', async ({ context }) => {
  const teamId = context.teamId;
  if (teamId) {
    await deleteInstallation({ teamId, enterpriseId: undefined, isEnterpriseInstall: false });
  }
});

// Custom routes using the built-in Express router
receiver.router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Reminder check endpoint (called by external cron)
receiver.router.post('/api/reminders/check', async (_req, res) => {
  const now = new Date();
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');

  try {
    const workspacesToRemind = await getWorkspacesToRemind(hour, minute);

    for (const workspace of workspacesToRemind) {
      if (!workspace.standupChannelId) continue;

      const today = now.toISOString().split('T')[0]!;
      const submitted = await getUsersWhoSubmitted(workspace.id, today);

      const client = app.client;
      let members: string[] = [];
      try {
        const result = await client.conversations.members({
          token: workspace.botToken,
          channel: workspace.standupChannelId,
        });
        members = result.members ?? [];
      } catch (e) {
        console.error(`Failed to get members for ${workspace.slackWorkspaceId}:`, e);
        continue;
      }

      const toRemind = members.filter(
        (m) => m.startsWith('U') && !submitted.has(m)
      );

      for (const userId of toRemind) {
        try {
          await client.chat.postMessage({
            token: workspace.botToken,
            channel: userId,
            text: "Hey! 👋 Time for your stand-up. Just reply here with what you worked on today! 📝",
          });
        } catch (e) {
          console.error(`Failed to send reminder to ${userId}:`, e);
        }
      }

      await getOrCreateTodayReminder(workspace.id);
      await markReminderSent(workspace.id, today);
    }

    const workspacesAtDeadline = await getWorkspacesAtDeadline(hour, minute);

    for (const workspace of workspacesAtDeadline) {
      if (!workspace.standupChannelId) continue;

      const today = now.toISOString().split('T')[0]!;
      await postDailyStandups(workspace, today);
    }

    res.json({ status: 'ok', reminded: workspacesToRemind.length, posted: workspacesAtDeadline.length });
  } catch (error) {
    console.error('Reminder check failed:', error);
    res.status(500).json({ status: 'error', message: 'Reminder check failed' });
  }
});

/**
 * Post daily standups to the channel as a thread
 */
async function postDailyStandups(
  workspace: { id: string; botToken: string; standupChannelId: string | null },
  date: string
): Promise<void> {
  if (!workspace.standupChannelId) return;

  const client = app.client;
  const standups = await getStandupsForDate(workspace.id, date);

  if (standups.length === 0) {
    await client.chat.postMessage({
      token: workspace.botToken,
      channel: workspace.standupChannelId,
      text: `📅 *Stand-ups for ${formatDate(date)}*\n\n_No stand-ups submitted today._`,
    });
    return;
  }

  const parentResult = await client.chat.postMessage({
    token: workspace.botToken,
    channel: workspace.standupChannelId,
    text: `📅 *Stand-ups for ${formatDate(date)}*`,
  });

  const threadTs = parentResult.ts;
  if (!threadTs) return;

  const userStandups = new Map<string, { userName?: string; isLate: boolean }>();
  for (const standup of standups) {
    if (!userStandups.has(standup.slackUserId)) {
      userStandups.set(standup.slackUserId, {
        userName: standup.userName ?? undefined,
        isLate: standup.isLate ?? false,
      });
    }
  }

  const standupIds: string[] = [];
  for (const [userId, info] of userStandups) {
    const aggregated = await aggregateUserStandups(workspace.id, userId, date);
    const lateTag = info.isLate ? ' _(late)_' : '';

    await client.chat.postMessage({
      token: workspace.botToken,
      channel: workspace.standupChannelId,
      thread_ts: threadTs,
      text: `*<@${userId}>*${lateTag}:\n${aggregated}`,
    });

    const userStandupIds = standups
      .filter((s) => s.slackUserId === userId)
      .map((s) => s.id);
    standupIds.push(...userStandupIds);
  }

  if (standupIds.length > 0) {
    await markAsPosted(standupIds, threadTs);
  }

  try {
    const membersResult = await client.conversations.members({
      token: workspace.botToken,
      channel: workspace.standupChannelId,
    });
    const members = membersResult.members ?? [];
    const submittedUsers = new Set(userStandups.keys());
    const missing = members.filter(
      (m) => m.startsWith('U') && !submittedUsers.has(m)
    );

    if (missing.length > 0) {
      await client.chat.postMessage({
        token: workspace.botToken,
        channel: workspace.standupChannelId,
        thread_ts: threadTs,
        text: `⏰ *Waiting on:* ${missing.map((m) => `<@${m}>`).join(', ')}`,
      });
    }
  } catch {
    // Continue without missing users tag
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Start the server
(async () => {
  const port = env.PORT;
  await app.start(port);
  console.log(`🚀 SUPS server running on port ${port}`);
  console.log(`📝 OAuth install URL: http://localhost:${port}/slack/install`);
})();
