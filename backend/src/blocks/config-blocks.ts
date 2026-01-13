/**
 * Reusable Block Kit components for configuration UI
 */

// Common timezone options grouped by region
const TIMEZONE_OPTIONS = [
  // Asia
  { text: 'India (Kolkata)', value: 'Asia/Kolkata' },
  { text: 'Singapore', value: 'Asia/Singapore' },
  { text: 'Japan (Tokyo)', value: 'Asia/Tokyo' },
  { text: 'China (Shanghai)', value: 'Asia/Shanghai' },
  { text: 'Hong Kong', value: 'Asia/Hong_Kong' },
  { text: 'Dubai', value: 'Asia/Dubai' },
  { text: 'Israel (Jerusalem)', value: 'Asia/Jerusalem' },
  // Europe
  { text: 'London (GMT)', value: 'Europe/London' },
  { text: 'Paris (CET)', value: 'Europe/Paris' },
  { text: 'Berlin', value: 'Europe/Berlin' },
  { text: 'Amsterdam', value: 'Europe/Amsterdam' },
  // Americas
  { text: 'US Eastern (New York)', value: 'America/New_York' },
  { text: 'US Central (Chicago)', value: 'America/Chicago' },
  { text: 'US Mountain (Denver)', value: 'America/Denver' },
  { text: 'US Pacific (Los Angeles)', value: 'America/Los_Angeles' },
  { text: 'Toronto', value: 'America/Toronto' },
  { text: 'São Paulo', value: 'America/Sao_Paulo' },
  // Australia/Pacific
  { text: 'Sydney', value: 'Australia/Sydney' },
  { text: 'Melbourne', value: 'Australia/Melbourne' },
  { text: 'Auckland', value: 'Pacific/Auckland' },
  // UTC
  { text: 'UTC', value: 'UTC' },
];

/**
 * Channel select block for choosing standup channel
 */
export function channelSelectBlock(initialChannel?: string) {
  return {
    type: 'section' as const,
    block_id: 'channel_block',
    text: {
      type: 'mrkdwn' as const,
      text: '*Stand-up Channel*\nWhere should I post daily stand-ups?',
    },
    accessory: {
      type: 'channels_select' as const,
      action_id: 'channel_select',
      placeholder: {
        type: 'plain_text' as const,
        text: 'Select a channel',
        emoji: true,
      },
      ...(initialChannel && { initial_channel: initialChannel }),
    },
  };
}

/**
 * Time picker block for reminder/deadline times
 */
export function timeSelectBlock(
  label: string,
  actionId: string,
  blockId: string,
  initialTime?: string
) {
  return {
    type: 'input' as const,
    block_id: blockId,
    label: {
      type: 'plain_text' as const,
      text: label,
      emoji: true,
    },
    element: {
      type: 'timepicker' as const,
      action_id: actionId,
      initial_time: initialTime ?? '19:00',
      placeholder: {
        type: 'plain_text' as const,
        text: 'Select time',
        emoji: true,
      },
    },
  };
}

/**
 * Timezone selector block
 */
export function timezoneSelectBlock(initialTimezone?: string) {
  const defaultTimezone = initialTimezone ?? 'America/New_York';
  const initialOption = TIMEZONE_OPTIONS.find((o) => o.value === defaultTimezone) ?? TIMEZONE_OPTIONS[0]!;

  return {
    type: 'input' as const,
    block_id: 'timezone_block',
    label: {
      type: 'plain_text' as const,
      text: 'Timezone',
      emoji: true,
    },
    element: {
      type: 'static_select' as const,
      action_id: 'timezone_select',
      initial_option: {
        text: {
          type: 'plain_text' as const,
          text: initialOption.text,
          emoji: true,
        },
        value: initialOption.value,
      },
      options: TIMEZONE_OPTIONS.map((tz) => ({
        text: {
          type: 'plain_text' as const,
          text: tz.text,
          emoji: true,
        },
        value: tz.value,
      })),
    },
  };
}

/**
 * Save button block
 */
export function saveButtonBlock() {
  return {
    type: 'actions' as const,
    elements: [
      {
        type: 'button' as const,
        action_id: 'save_config',
        text: {
          type: 'plain_text' as const,
          text: '💾 Save Configuration',
          emoji: true,
        },
        style: 'primary' as const,
      },
    ],
  };
}

/**
 * Header block
 */
export function headerBlock(text: string) {
  return {
    type: 'header' as const,
    text: {
      type: 'plain_text' as const,
      text,
      emoji: true,
    },
  };
}

/**
 * Divider block
 */
export function dividerBlock() {
  return {
    type: 'divider' as const,
  };
}

/**
 * Display block for showing current configuration
 */
export function configDisplayBlock(
  label: string,
  value: string,
  valueType: 'channel' | 'time' | 'text'
) {
  let displayValue: string;

  switch (valueType) {
    case 'channel':
      displayValue = `<#${value}>`;
      break;
    case 'time':
      displayValue = `\`${value}\``;
      break;
    case 'text':
    default:
      displayValue = value;
  }

  return {
    type: 'section' as const,
    text: {
      type: 'mrkdwn' as const,
      text: `*${label}:* ${displayValue}`,
    },
  };
}

/**
 * Context block for helper text
 */
export function contextBlock(text: string) {
  return {
    type: 'context' as const,
    elements: [
      {
        type: 'mrkdwn' as const,
        text,
      },
    ],
  };
}
