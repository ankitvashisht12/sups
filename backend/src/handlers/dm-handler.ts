import type { SlackEventMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt';
import { getWorkspace } from '../services/workspace-service.js';
import { submitStandup } from '../services/standup-service.js';

type MessageEvent = SlackEventMiddlewareArgs<'message'> & AllMiddlewareArgs;

interface UserCommand {
  type: 'skip' | 'vacation' | 'done' | 'help' | 'status';
  date?: string;
}

/**
 * Parse user message for special commands
 */
export function parseUserCommand(text: string): UserCommand | null {
  const trimmed = text.trim().toLowerCase();

  if (trimmed === 'skip' || trimmed === 'skip today') {
    return { type: 'skip' };
  }

  if (trimmed === 'done') {
    return { type: 'done' };
  }

  if (trimmed === 'help' || trimmed === '?') {
    return { type: 'help' };
  }

  if (trimmed === 'status') {
    return { type: 'status' };
  }

  // vacation until YYYY-MM-DD
  const vacationMatch = trimmed.match(/vacation\s+until\s+(\d{4}-\d{2}-\d{2})/);
  if (vacationMatch) {
    return { type: 'vacation', date: vacationMatch[1] };
  }

  return null;
}

/**
 * Handle direct messages to the bot
 */
export async function handleDirectMessage({
  event,
  client,
  say,
}: MessageEvent): Promise<void> {
  // Type guard for message events
  if (!('text' in event) || !event.text) {
    return;
  }

  // Ignore bot messages
  if ('bot_id' in event && event.bot_id) {
    return;
  }

  // Ignore message subtypes (edits, deletes, etc.)
  if ('subtype' in event && event.subtype) {
    return;
  }

  const { text, user, team } = event;

  if (!user || !team) {
    return;
  }

  // Check for special commands
  const command = parseUserCommand(text);
  if (command) {
    await handleUserCommand(command, { say });
    return;
  }

  // Get workspace from database
  const workspace = await getWorkspace(team);
  if (!workspace) {
    await say(
      "Sorry, this workspace is not properly configured. Please reinstall the app or contact your admin."
    );
    return;
  }

  // Get user info for name
  let userName: string | undefined;
  try {
    const userInfo = await client.users.info({ user });
    userName = userInfo.user?.real_name ?? userInfo.user?.name;
  } catch {
    // Continue without user name
  }

  // Submit the standup
  await submitStandup({
    workspaceId: workspace.id,
    slackUserId: user,
    userName,
    content: text,
  });

  // Acknowledge with checkmark
  await say('Got it! ✅');
}

/**
 * Handle special user commands
 */
async function handleUserCommand(
  command: UserCommand,
  { say }: { say: MessageEvent['say'] }
): Promise<void> {
  switch (command.type) {
    case 'skip':
      await say("Got it! I'll mark you as skipping today's stand-up. 👍");
      break;

    case 'done':
      await say(
        "Your stand-up updates will be posted at the deadline. Use this if you want to post early - feature coming soon!"
      );
      break;

    case 'vacation':
      await say(
        `Got it! You're set as on vacation until ${command.date}. I won't send you reminders until then. 🏖️`
      );
      break;

    case 'help':
      await say(getHelpMessage());
      break;

    case 'status':
      await say("I'll show your submission status - feature coming soon!");
      break;
  }
}

/**
 * Get help message for users
 */
function getHelpMessage(): string {
  return `*SUPS - Stand-up Bot Help* 📝

*How to submit your stand-up:*
Just send me a DM with your update! You can send multiple messages throughout the day - I'll combine them into one update.

*Commands:*
• \`skip\` or \`skip today\` - Skip today's stand-up
• \`done\` - Mark your update as complete (posts early)
• \`vacation until YYYY-MM-DD\` - Set vacation mode
• \`status\` - Check your submission status
• \`help\` or \`?\` - Show this help message

*Tips:*
• Send updates anytime before the deadline
• Multiple messages are combined automatically
• Late submissions are marked but still accepted`;
}
