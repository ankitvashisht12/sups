import type { SlackEventMiddlewareArgs, SlackActionMiddlewareArgs, AllMiddlewareArgs, BlockAction } from '@slack/bolt';
import { getWorkspace, updateWorkspaceConfig } from '../services/workspace-service.js';
import type { Workspace } from '../db/schema.js';
import {
  channelSelectBlock,
  timeSelectBlock,
  timezoneSelectBlock,
  saveButtonBlock,
  headerBlock,
  dividerBlock,
  configDisplayBlock,
  contextBlock,
} from '../blocks/config-blocks.js';

type AppHomeOpenedEvent = SlackEventMiddlewareArgs<'app_home_opened'> & AllMiddlewareArgs;

interface HomeView {
  type: 'home';
  blocks: object[];
}

/**
 * Build the App Home view based on workspace configuration state
 * @param workspace - The workspace configuration
 * @param userTimezone - Optional user's timezone from their Slack profile (for auto-detection)
 */
export function buildHomeView(workspace: Workspace | null, userTimezone?: string): HomeView {
  const isConfigured = workspace?.standupChannelId != null;

  if (isConfigured && workspace) {
    return buildConfiguredView(workspace);
  }

  return buildSetupView(workspace, userTimezone);
}

/**
 * Build setup view for unconfigured workspaces
 */
function buildSetupView(workspace: Workspace | null, userTimezone?: string): HomeView {
  const currentChannel = workspace?.standupChannelId ?? undefined;
  const currentReminderTime = workspace?.reminderTime
    ? formatTimeForPicker(workspace.reminderTime)
    : '19:00';
  const currentDeadlineTime = workspace?.deadlineTime
    ? formatTimeForPicker(workspace.deadlineTime)
    : '20:00';
  // Priority: workspace setting > user's Slack timezone > default
  const currentTimezone = workspace?.timezone ?? userTimezone ?? 'America/New_York';

  return {
    type: 'home',
    blocks: [
      headerBlock('🚀 SUPS Setup'),
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: "Welcome to SUPS! Let's get your team's stand-ups configured.",
        },
      },
      dividerBlock(),
      channelSelectBlock(currentChannel),
      timeSelectBlock('Reminder Time', 'reminder_time_select', 'reminder_block', currentReminderTime),
      contextBlock('_When to send DM reminders to team members who haven\'t submitted_'),
      timeSelectBlock('Deadline Time', 'deadline_time_select', 'deadline_block', currentDeadlineTime),
      contextBlock('_When to post all stand-ups to the channel and tag missing users_'),
      timezoneSelectBlock(currentTimezone),
      dividerBlock(),
      saveButtonBlock(),
    ],
  };
}

/**
 * Build configured view showing current settings
 */
function buildConfiguredView(workspace: Workspace): HomeView {
  const reminderTime = workspace.reminderTime
    ? formatTimeForDisplay(workspace.reminderTime)
    : '7:00 PM';
  const deadlineTime = workspace.deadlineTime
    ? formatTimeForDisplay(workspace.deadlineTime)
    : '8:00 PM';

  return {
    type: 'home',
    blocks: [
      headerBlock('✅ SUPS Configured'),
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Your stand-up bot is ready to go! Here are your current settings:',
        },
      },
      dividerBlock(),
      configDisplayBlock('Stand-up Channel', workspace.standupChannelId!, 'channel'),
      configDisplayBlock('Reminder Time', reminderTime, 'time'),
      configDisplayBlock('Deadline Time', deadlineTime, 'time'),
      configDisplayBlock('Timezone', workspace.timezone ?? 'America/New_York', 'text'),
      dividerBlock(),
      headerBlock('📝 Update Settings'),
      channelSelectBlock(workspace.standupChannelId ?? undefined),
      timeSelectBlock(
        'Reminder Time',
        'reminder_time_select',
        'reminder_block',
        formatTimeForPicker(workspace.reminderTime ?? '19:00:00')
      ),
      timeSelectBlock(
        'Deadline Time',
        'deadline_time_select',
        'deadline_block',
        formatTimeForPicker(workspace.deadlineTime ?? '20:00:00')
      ),
      timezoneSelectBlock(workspace.timezone ?? 'America/New_York'),
      dividerBlock(),
      saveButtonBlock(),
    ],
  };
}

/**
 * Handle app_home_opened event
 */
export async function handleAppHomeOpened({
  event,
  client,
  context,
}: AppHomeOpenedEvent): Promise<void> {
  // Only handle the home tab, not messages tab
  if (event.tab !== 'home') {
    return;
  }

  const teamId = context.teamId;
  if (!teamId) {
    console.error('No team ID in context for app_home_opened');
    return;
  }

  const workspace = await getWorkspace(teamId);

  // Get user's timezone from Slack profile
  let userTimezone: string | undefined;
  try {
    const userInfo = await client.users.info({ user: event.user });
    userTimezone = userInfo.user?.tz;
  } catch {
    // Continue without user timezone - will use default
  }

  const view = buildHomeView(workspace, userTimezone);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await client.views.publish({
    user_id: event.user,
    view: view as any,
  });
}

type SaveConfigArgs = SlackActionMiddlewareArgs<BlockAction> & AllMiddlewareArgs;

/**
 * Handle save_config button click
 */
export async function handleSaveConfig({
  body,
  client,
  ack,
}: SaveConfigArgs): Promise<void> {
  await ack();

  const teamId = body.team?.id;
  const userId = body.user?.id;

  if (!teamId || !userId) {
    console.error('Missing team or user ID in save_config action');
    return;
  }

  const workspace = await getWorkspace(teamId);
  if (!workspace) {
    console.error(`Workspace not found for team: ${teamId}`);
    return;
  }

  // Extract values from the view state
  const values = body.view?.state?.values;
  if (!values) {
    console.error('No values in view state');
    return;
  }

  const selectedChannel = values.channel_block?.channel_select?.selected_channel;
  const selectedReminderTime = values.reminder_block?.reminder_time_select?.selected_time;
  const selectedDeadlineTime = values.deadline_block?.deadline_time_select?.selected_time;
  const selectedTimezone = values.timezone_block?.timezone_select?.selected_option?.value;

  // Update workspace configuration
  const updatedWorkspace = await updateWorkspaceConfig(workspace.id, {
    standupChannelId: selectedChannel ?? workspace.standupChannelId ?? undefined,
    reminderTime: selectedReminderTime ? `${selectedReminderTime}:00` : undefined,
    deadlineTime: selectedDeadlineTime ? `${selectedDeadlineTime}:00` : undefined,
    timezone: selectedTimezone ?? undefined,
  });

  // Refresh the home view
  const view = buildHomeView(updatedWorkspace);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await client.views.publish({
    user_id: userId,
    view: view as any,
  });
}

/**
 * Format time from database format (HH:MM:SS) to picker format (HH:MM)
 */
function formatTimeForPicker(time: string): string {
  // Handle both HH:MM:SS and HH:MM formats
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}

/**
 * Format time for display (e.g., "7:00 PM")
 */
function formatTimeForDisplay(time: string): string {
  const parts = time.split(':');
  let hours = parseInt(parts[0]!, 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';

  if (hours > 12) {
    hours -= 12;
  } else if (hours === 0) {
    hours = 12;
  }

  return `${hours}:${minutes} ${ampm}`;
}
