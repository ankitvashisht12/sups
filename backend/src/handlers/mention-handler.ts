import type { SlackEventMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { getWorkspace } from '../services/workspace-service.js';
import {
  getSubmissionStatus,
  getStandupsForDate,
  aggregateUserStandups,
  markAsPosted,
} from '../services/standup-service.js';
import { getUsersWhoSubmitted } from '../services/reminder-service.js';
import type { Workspace } from '../db/schema.js';

type AppMentionEvent = SlackEventMiddlewareArgs<'app_mention'> & AllMiddlewareArgs;

/**
 * Handle @SUPS mentions in channels
 */
export async function handleAppMention({
  event,
  client,
  say,
}: AppMentionEvent): Promise<void> {
  const { text, user, team, channel } = event;

  if (!team) {
    return;
  }

  // Get workspace
  const workspace = await getWorkspace(team);
  if (!workspace) {
    await say('This workspace is not properly configured. Please reinstall the app.');
    return;
  }

  // Parse command from mention text
  // Remove the bot mention to get the command
  const command = text.replace(/<@[A-Z0-9]+>/gi, '').trim().toLowerCase();

  if (command === 'status' || command === '') {
    await handleStatusCommand({ workspace, channel, client, say });
  } else if (command === 'help') {
    await handleHelpCommand({ say });
  } else if (command.startsWith('config')) {
    await handleConfigCommand({ workspace, user, say });
  } else if (command === 'demo reminder' || command === 'demo reminders') {
    await handleDemoReminder({ workspace, client, say });
  } else if (command === 'demo standup' || command === 'demo standups') {
    await handleDemoStandups({ workspace, client, say });
  } else if (isCreatorQuestion(command)) {
    await handleCreatorCommand({ say });
  } else {
    await say(
      `I didn't understand that command. Try \`@SUPS status\` or \`@SUPS help\` for available commands.`
    );
  }
}

interface StatusCommandContext {
  workspace: { id: string; standupChannelId: string | null };
  channel: string;
  client: AppMentionEvent['client'];
  say: AppMentionEvent['say'];
}

/**
 * Handle @SUPS status command
 */
async function handleStatusCommand({
  workspace,
  channel,
  client,
  say,
}: StatusCommandContext): Promise<void> {
  const today = new Date().toISOString().split('T')[0]!;
  const status = await getSubmissionStatus(workspace.id, today);

  // Get channel members to know who's missing
  let channelMembers: string[] = [];
  if (workspace.standupChannelId) {
    try {
      const result = await client.conversations.members({
        channel: workspace.standupChannelId,
      });
      channelMembers = result.members ?? [];
    } catch {
      // Continue without member list
    }
  }

  // Filter out bots from channel members (basic check - starts with U)
  const humanMembers = channelMembers.filter((m) => m.startsWith('U'));

  // Find missing users
  const submittedSet = new Set(status.submitted);
  const missing = humanMembers.filter((m) => !submittedSet.has(m));

  // Build status message
  const blocks = buildStatusBlocks(status, missing);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await say({ blocks: blocks as any });
}

interface SubmissionStatus {
  submitted: string[];
  late: string[];
  userNames: Record<string, string>;
}

/**
 * Build Block Kit blocks for status display
 */
function buildStatusBlocks(
  status: SubmissionStatus,
  missing: string[]
): object[] {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const blocks: object[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📊 Stand-up Status - ${today}`,
        emoji: true,
      },
    },
    {
      type: 'divider',
    },
  ];

  // Submitted section
  if (status.submitted.length > 0) {
    const onTime = status.submitted.filter((u) => !status.late.includes(u));

    if (onTime.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Submitted:* ${onTime.map((u) => `<@${u}>`).join(', ')}`,
        },
      });
    }

    if (status.late.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🕐 *Submitted Late:* ${status.late.map((u) => `<@${u}>`).join(', ')}`,
        },
      });
    }
  }

  // Missing section
  if (missing.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `❌ *Missing:* ${missing.map((u) => `<@${u}>`).join(', ')}`,
      },
    });
  }

  // Summary
  const total = status.submitted.length + missing.length;
  if (total > 0) {
    blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${status.submitted.length}/${total} submitted`,
          },
        ],
      }
    );
  } else {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '_No stand-ups submitted yet today._',
      },
    });
  }

  return blocks;
}

interface HelpCommandContext {
  say: AppMentionEvent['say'];
}

/**
 * Handle @SUPS help command
 */
async function handleHelpCommand({ say }: HelpCommandContext): Promise<void> {
  await say({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📝 SUPS - Stand-up Bot',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Channel Commands:*\n• `@SUPS status` - Show submission status for today\n• `@SUPS help` - Show this help message\n• `@SUPS config` - Open configuration (admins only)\n• `@SUPS demo reminder` - 🧪 Test: Send reminders now\n• `@SUPS demo standups` - 🧪 Test: Post standups to channel now',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*DM Commands:*\nSend a direct message to submit your stand-up!\n• `skip` - Skip today\'s stand-up\n• `done` - Post your update early\n• `vacation until YYYY-MM-DD` - Set vacation mode',
        },
      },
    ],
  });
}

interface ConfigCommandContext {
  workspace: { id: string };
  user?: string;
  say: AppMentionEvent['say'];
}

/**
 * Handle @SUPS config command
 */
async function handleConfigCommand({
  workspace,
  user,
  say,
}: ConfigCommandContext): Promise<void> {
  // TODO: Check if user is admin
  // TODO: Open configuration modal
  await say(
    'Configuration modal coming soon! For now, settings are configured during app installation.'
  );
}

interface DemoCommandContext {
  workspace: Workspace;
  client: AppMentionEvent['client'];
  say: AppMentionEvent['say'];
}

/**
 * Handle @SUPS demo reminder - triggers reminder flow for testing
 */
async function handleDemoReminder({
  workspace,
  client,
  say,
}: DemoCommandContext): Promise<void> {
  if (!workspace.standupChannelId) {
    await say('⚠️ No standup channel configured. Please set up the app first by clicking on SUPS in the sidebar.');
    return;
  }

  await say('🧪 *Demo Mode:* Triggering reminder flow...');

  const today = new Date().toISOString().split('T')[0]!;
  const submitted = await getUsersWhoSubmitted(workspace.id, today);

  // Get channel members
  let members: string[] = [];
  try {
    const result = await client.conversations.members({
      channel: workspace.standupChannelId,
    });
    members = result.members ?? [];
  } catch (e) {
    await say(`❌ Failed to get channel members: ${e}`);
    return;
  }

  // Filter to humans who haven't submitted
  const toRemind = members.filter((m) => m.startsWith('U') && !submitted.has(m));

  if (toRemind.length === 0) {
    await say('✅ Everyone has already submitted! No reminders needed.');
    return;
  }

  // Send DM reminders
  let sentCount = 0;
  for (const userId of toRemind) {
    try {
      await client.chat.postMessage({
        channel: userId,
        text: "🧪 *[DEMO]* Hey! 👋 Time for your stand-up. Just reply here with what you worked on today! 📝",
      });
      sentCount++;
    } catch (e) {
      console.error(`Failed to send demo reminder to ${userId}:`, e);
    }
  }

  await say(`✅ Demo reminders sent to ${sentCount} users: ${toRemind.map((u) => `<@${u}>`).join(', ')}`);
}

/**
 * Handle @SUPS demo standups - triggers standup posting flow for testing
 */
async function handleDemoStandups({
  workspace,
  client,
  say,
}: DemoCommandContext): Promise<void> {
  if (!workspace.standupChannelId) {
    await say('⚠️ No standup channel configured. Please set up the app first by clicking on SUPS in the sidebar.');
    return;
  }

  await say('🧪 *Demo Mode:* Posting standups to channel...');

  const today = new Date().toISOString().split('T')[0]!;
  const standups = await getStandupsForDate(workspace.id, today);

  if (standups.length === 0) {
    await say('📭 No standups submitted today. DM me with your update first, then try again!');
    return;
  }

  // Create parent message
  const parentResult = await client.chat.postMessage({
    channel: workspace.standupChannelId,
    text: `🧪 *[DEMO]* 📅 *Stand-ups for ${formatDate(today)}*`,
  });

  const threadTs = parentResult.ts;
  if (!threadTs) {
    await say('❌ Failed to create thread.');
    return;
  }

  // Group standups by user
  const userStandups = new Map<string, { userName?: string; isLate: boolean }>();
  for (const standup of standups) {
    if (!userStandups.has(standup.slackUserId)) {
      userStandups.set(standup.slackUserId, {
        userName: standup.userName ?? undefined,
        isLate: standup.isLate ?? false,
      });
    }
  }

  // Post each user's aggregated standup
  const standupIds: string[] = [];
  for (const [userId, info] of userStandups) {
    const aggregated = await aggregateUserStandups(workspace.id, userId, today);
    const lateTag = info.isLate ? ' _(late)_' : '';

    await client.chat.postMessage({
      channel: workspace.standupChannelId,
      thread_ts: threadTs,
      text: `*<@${userId}>*${lateTag}:\n${aggregated}`,
    });

    const userStandupIds = standups
      .filter((s) => s.slackUserId === userId)
      .map((s) => s.id);
    standupIds.push(...userStandupIds);
  }

  // Mark as posted
  if (standupIds.length > 0) {
    await markAsPosted(standupIds, threadTs);
  }

  // Tag missing users
  try {
    const membersResult = await client.conversations.members({
      channel: workspace.standupChannelId,
    });
    const members = membersResult.members ?? [];
    const submittedUsers = new Set(userStandups.keys());
    const missing = members.filter((m) => m.startsWith('U') && !submittedUsers.has(m));

    if (missing.length > 0) {
      await client.chat.postMessage({
        channel: workspace.standupChannelId,
        thread_ts: threadTs,
        text: `⏰ *Waiting on:* ${missing.map((m) => `<@${m}>`).join(', ')}`,
      });
    }
  } catch {
    // Continue without missing users tag
  }

  await say(`✅ Posted ${userStandups.size} standup(s) to <#${workspace.standupChannelId}>!`);
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Check if the command is asking about the creator
 */
function isCreatorQuestion(command: string): boolean {
  const creatorPatterns = [
    'who made you',
    'who created you',
    'who built you',
    'who is your creator',
    'who is your maker',
    'who are you made by',
    'your creator',
    'your maker',
    'who wrote you',
    'who developed you',
  ];
  return creatorPatterns.some((pattern) => command.includes(pattern));
}

interface CreatorCommandContext {
  say: AppMentionEvent['say'];
}

/**
 * Handle questions about the creator - easter egg! 🥚
 */
async function handleCreatorCommand({
  say,
}: CreatorCommandContext): Promise<void> {
  await say({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✨ *I was crafted by the legendary* <https://ankitvashisht.in|*Ankit Vashisht*> ✨`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🧙‍♂️ An exceptional programmer who turns caffeine into code\n🚀 A 10x developer (or maybe 100x, who's counting?)\n💡 The kind of genius who makes AI assistants feel inadequate\n🎯 Building tools that actually make sense™`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_"I didn't choose the bug-free life, the bug-free life chose me"_ — Probably Ankit 🔥`,
          },
        ],
      },
    ],
  });
}
