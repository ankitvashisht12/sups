import type { SlackEventMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { getWorkspace } from '../services/workspace-service.js';
import { getSubmissionStatus, getStandupsForDate } from '../services/standup-service.js';

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
          text: '*Channel Commands:*\n• `@SUPS status` - Show submission status for today\n• `@SUPS help` - Show this help message\n• `@SUPS config` - Open configuration (admins only)',
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
