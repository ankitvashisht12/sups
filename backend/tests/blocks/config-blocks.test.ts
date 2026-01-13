import { describe, it, expect } from 'vitest';
import {
  channelSelectBlock,
  timeSelectBlock,
  timezoneSelectBlock,
  saveButtonBlock,
  headerBlock,
  dividerBlock,
  configDisplayBlock,
} from '../../src/blocks/config-blocks.js';

describe('Config Blocks', () => {
  describe('channelSelectBlock', () => {
    it('should return a section with channels_select accessory', () => {
      const block = channelSelectBlock();

      expect(block.type).toBe('section');
      expect(block.block_id).toBe('channel_block');
      expect(block.accessory.type).toBe('channels_select');
      expect(block.accessory.action_id).toBe('channel_select');
    });

    it('should include initial channel when provided', () => {
      const block = channelSelectBlock('C12345678');

      expect(block.accessory.initial_channel).toBe('C12345678');
    });

    it('should not include initial channel when not provided', () => {
      const block = channelSelectBlock();

      expect(block.accessory.initial_channel).toBeUndefined();
    });

    it('should have descriptive placeholder text', () => {
      const block = channelSelectBlock();

      expect(block.accessory.placeholder.text).toContain('channel');
    });
  });

  describe('timeSelectBlock', () => {
    it('should return an input block with timepicker', () => {
      const block = timeSelectBlock('Reminder Time', 'reminder_time_select', 'reminder_block');

      expect(block.type).toBe('input');
      expect(block.block_id).toBe('reminder_block');
      expect(block.element.type).toBe('timepicker');
      expect(block.element.action_id).toBe('reminder_time_select');
    });

    it('should set initial time when provided', () => {
      const block = timeSelectBlock('Reminder Time', 'reminder_time_select', 'reminder_block', '18:30');

      expect(block.element.initial_time).toBe('18:30');
    });

    it('should use default time when not provided', () => {
      const block = timeSelectBlock('Reminder Time', 'reminder_time_select', 'reminder_block');

      expect(block.element.initial_time).toBeDefined();
    });

    it('should include label text', () => {
      const block = timeSelectBlock('Deadline Time', 'deadline_time_select', 'deadline_block');

      expect(block.label.text).toBe('Deadline Time');
    });
  });

  describe('timezoneSelectBlock', () => {
    it('should return an input block with static_select', () => {
      const block = timezoneSelectBlock();

      expect(block.type).toBe('input');
      expect(block.block_id).toBe('timezone_block');
      expect(block.element.type).toBe('static_select');
      expect(block.element.action_id).toBe('timezone_select');
    });

    it('should include common global timezones as options', () => {
      const block = timezoneSelectBlock();

      const options = block.element.options;
      const timezoneValues = options.map((o: any) => o.value);

      // Asia
      expect(timezoneValues).toContain('Asia/Kolkata');
      expect(timezoneValues).toContain('Asia/Tokyo');
      // Americas
      expect(timezoneValues).toContain('America/New_York');
      expect(timezoneValues).toContain('America/Los_Angeles');
      // Europe
      expect(timezoneValues).toContain('Europe/London');
    });

    it('should set initial option when provided', () => {
      const block = timezoneSelectBlock('America/Chicago');

      expect(block.element.initial_option.value).toBe('America/Chicago');
    });

    it('should default to America/New_York when not provided', () => {
      const block = timezoneSelectBlock();

      expect(block.element.initial_option.value).toBe('America/New_York');
    });
  });

  describe('saveButtonBlock', () => {
    it('should return an actions block with button', () => {
      const block = saveButtonBlock();

      expect(block.type).toBe('actions');
      expect(block.elements).toHaveLength(1);
      expect(block.elements[0].type).toBe('button');
      expect(block.elements[0].action_id).toBe('save_config');
    });

    it('should have primary style', () => {
      const block = saveButtonBlock();

      expect(block.elements[0].style).toBe('primary');
    });

    it('should have save text', () => {
      const block = saveButtonBlock();

      expect(block.elements[0].text.text).toContain('Save');
    });
  });

  describe('headerBlock', () => {
    it('should return a header block with text', () => {
      const block = headerBlock('Welcome to SUPS');

      expect(block.type).toBe('header');
      expect(block.text.type).toBe('plain_text');
      expect(block.text.text).toBe('Welcome to SUPS');
    });

    it('should enable emoji by default', () => {
      const block = headerBlock('Test Header');

      expect(block.text.emoji).toBe(true);
    });
  });

  describe('dividerBlock', () => {
    it('should return a divider block', () => {
      const block = dividerBlock();

      expect(block.type).toBe('divider');
    });
  });

  describe('configDisplayBlock', () => {
    it('should display channel as linked', () => {
      const block = configDisplayBlock('Channel', 'C12345678', 'channel');

      expect(block.type).toBe('section');
      expect(block.text.text).toContain('<#C12345678>');
    });

    it('should display time in readable format', () => {
      const block = configDisplayBlock('Reminder Time', '19:00', 'time');

      expect(block.type).toBe('section');
      expect(block.text.text).toContain('19:00');
    });

    it('should display timezone as plain text', () => {
      const block = configDisplayBlock('Timezone', 'America/New_York', 'text');

      expect(block.type).toBe('section');
      expect(block.text.text).toContain('America/New_York');
    });
  });
});
