import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockWorkspace } from '../setup.js';

// Mock services
vi.mock('../../src/services/workspace-service.js', () => ({
  getWorkspace: vi.fn(),
  updateWorkspaceConfig: vi.fn(),
}));

// Import after mocking
import { getWorkspace, updateWorkspaceConfig } from '../../src/services/workspace-service.js';
import {
  buildHomeView,
  handleAppHomeOpened,
  handleSaveConfig,
} from '../../src/handlers/home-handler.js';

describe('Home Handler', () => {
  const mockClient = {
    views: {
      publish: vi.fn().mockResolvedValue({ ok: true }),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildHomeView', () => {
    it('should return setup view when workspace has no standup channel configured', () => {
      const workspace = createMockWorkspace({ standupChannelId: null });

      const view = buildHomeView(workspace);

      expect(view.type).toBe('home');
      // Should have header
      expect(view.blocks).toContainEqual(
        expect.objectContaining({
          type: 'header',
          text: expect.objectContaining({
            text: expect.stringContaining('Setup'),
          }),
        })
      );
      // Should have channel select
      expect(view.blocks).toContainEqual(
        expect.objectContaining({
          type: 'section',
          accessory: expect.objectContaining({
            type: 'channels_select',
            action_id: 'channel_select',
          }),
        })
      );
      // Should have save button
      expect(view.blocks).toContainEqual(
        expect.objectContaining({
          type: 'actions',
          elements: expect.arrayContaining([
            expect.objectContaining({
              action_id: 'save_config',
            }),
          ]),
        })
      );
    });

    it('should return configured view when workspace has standup channel set', () => {
      const workspace = createMockWorkspace({
        standupChannelId: 'C12345678',
        reminderTime: '18:30:00',
        deadlineTime: '19:30:00',
        timezone: 'America/Los_Angeles',
      });

      const view = buildHomeView(workspace);

      expect(view.type).toBe('home');
      // Should show current configuration
      expect(view.blocks).toContainEqual(
        expect.objectContaining({
          type: 'section',
          text: expect.objectContaining({
            text: expect.stringContaining('C12345678'),
          }),
        })
      );
    });

    it('should include time select blocks', () => {
      const workspace = createMockWorkspace({ standupChannelId: null });

      const view = buildHomeView(workspace);

      // Should have reminder time picker
      const hasReminderTime = view.blocks.some(
        (block: any) =>
          block.accessory?.action_id === 'reminder_time_select' ||
          block.element?.action_id === 'reminder_time_select'
      );
      expect(hasReminderTime).toBe(true);

      // Should have deadline time picker
      const hasDeadlineTime = view.blocks.some(
        (block: any) =>
          block.accessory?.action_id === 'deadline_time_select' ||
          block.element?.action_id === 'deadline_time_select'
      );
      expect(hasDeadlineTime).toBe(true);
    });

    it('should include timezone selector', () => {
      const workspace = createMockWorkspace({ standupChannelId: null });

      const view = buildHomeView(workspace);

      const hasTimezone = view.blocks.some(
        (block: any) =>
          block.accessory?.action_id === 'timezone_select' ||
          block.element?.action_id === 'timezone_select'
      );
      expect(hasTimezone).toBe(true);
    });

    it('should handle null workspace (new install)', () => {
      const view = buildHomeView(null);

      expect(view.type).toBe('home');
      // Should show setup view
      expect(view.blocks).toContainEqual(
        expect.objectContaining({
          type: 'header',
        })
      );
    });
  });

  describe('handleAppHomeOpened', () => {
    it('should publish home view when user opens app home', async () => {
      const mockWorkspace = createMockWorkspace();
      vi.mocked(getWorkspace).mockResolvedValue(mockWorkspace);

      const event = {
        type: 'app_home_opened',
        user: 'U12345678',
        tab: 'home',
        channel: 'D12345678',
        event_ts: '1234567890.123456',
      } as any;

      await handleAppHomeOpened({
        event,
        client: mockClient as any,
        context: { teamId: 'T12345678', isEnterpriseInstall: false } as any,
      } as any);

      expect(getWorkspace).toHaveBeenCalledWith('T12345678');
      expect(mockClient.views.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'U12345678',
          view: expect.objectContaining({
            type: 'home',
          }),
        })
      );
    });

    it('should not publish for messages tab', async () => {
      const event = {
        type: 'app_home_opened',
        user: 'U12345678',
        tab: 'messages',
        channel: 'D12345678',
        event_ts: '1234567890.123456',
      } as any;

      await handleAppHomeOpened({
        event,
        client: mockClient as any,
        context: { teamId: 'T12345678', isEnterpriseInstall: false } as any,
      } as any);

      expect(mockClient.views.publish).not.toHaveBeenCalled();
    });

    it('should handle missing team ID gracefully', async () => {
      const event = {
        type: 'app_home_opened',
        user: 'U12345678',
        tab: 'home',
        channel: 'D12345678',
        event_ts: '1234567890.123456',
      } as any;

      await handleAppHomeOpened({
        event,
        client: mockClient as any,
        context: { isEnterpriseInstall: false } as any,
      } as any);

      expect(mockClient.views.publish).not.toHaveBeenCalled();
    });
  });

  describe('handleSaveConfig', () => {
    it('should update workspace config with selected values', async () => {
      const mockWorkspace = createMockWorkspace();
      vi.mocked(getWorkspace).mockResolvedValue(mockWorkspace);
      vi.mocked(updateWorkspaceConfig).mockResolvedValue(mockWorkspace);

      const body = {
        type: 'block_actions',
        user: { id: 'U12345678' },
        team: { id: 'T12345678' },
        actions: [],
        token: 'test-token',
        response_url: 'https://test.slack.com/response',
        trigger_id: 'test-trigger',
        api_app_id: 'A12345678',
        view: {
          state: {
            values: {
              channel_block: {
                channel_select: {
                  selected_channel: 'C99999999',
                },
              },
              reminder_block: {
                reminder_time_select: {
                  selected_time: '18:00',
                },
              },
              deadline_block: {
                deadline_time_select: {
                  selected_time: '19:00',
                },
              },
              timezone_block: {
                timezone_select: {
                  selected_option: { value: 'America/Chicago' },
                },
              },
            },
          },
        },
      } as any;

      await handleSaveConfig({
        body,
        client: mockClient as any,
        ack: vi.fn(),
      } as any);

      expect(updateWorkspaceConfig).toHaveBeenCalledWith(
        mockWorkspace.id,
        expect.objectContaining({
          standupChannelId: 'C99999999',
          reminderTime: '18:00:00',
          deadlineTime: '19:00:00',
          timezone: 'America/Chicago',
        })
      );
    });

    it('should refresh home view after saving', async () => {
      const mockWorkspace = createMockWorkspace();
      vi.mocked(getWorkspace).mockResolvedValue(mockWorkspace);
      vi.mocked(updateWorkspaceConfig).mockResolvedValue({
        ...mockWorkspace,
        standupChannelId: 'C99999999',
      });

      const body = {
        type: 'block_actions',
        user: { id: 'U12345678' },
        team: { id: 'T12345678' },
        actions: [],
        token: 'test-token',
        response_url: 'https://test.slack.com/response',
        trigger_id: 'test-trigger',
        api_app_id: 'A12345678',
        view: {
          state: {
            values: {
              channel_block: {
                channel_select: {
                  selected_channel: 'C99999999',
                },
              },
              reminder_block: {
                reminder_time_select: {
                  selected_time: '18:00',
                },
              },
              deadline_block: {
                deadline_time_select: {
                  selected_time: '19:00',
                },
              },
              timezone_block: {
                timezone_select: {
                  selected_option: { value: 'America/New_York' },
                },
              },
            },
          },
        },
      } as any;

      await handleSaveConfig({
        body,
        client: mockClient as any,
        ack: vi.fn(),
      } as any);

      expect(mockClient.views.publish).toHaveBeenCalled();
    });

    it('should call ack to acknowledge the action', async () => {
      const mockWorkspace = createMockWorkspace();
      vi.mocked(getWorkspace).mockResolvedValue(mockWorkspace);
      vi.mocked(updateWorkspaceConfig).mockResolvedValue(mockWorkspace);
      const mockAck = vi.fn();

      const body = {
        type: 'block_actions',
        user: { id: 'U12345678' },
        team: { id: 'T12345678' },
        actions: [],
        token: 'test-token',
        response_url: 'https://test.slack.com/response',
        trigger_id: 'test-trigger',
        api_app_id: 'A12345678',
        view: {
          state: {
            values: {
              channel_block: { channel_select: { selected_channel: 'C99999999' } },
              reminder_block: { reminder_time_select: { selected_time: '18:00' } },
              deadline_block: { deadline_time_select: { selected_time: '19:00' } },
              timezone_block: { timezone_select: { selected_option: { value: 'America/New_York' } } },
            },
          },
        },
      } as any;

      await handleSaveConfig({
        body,
        client: mockClient as any,
        ack: mockAck,
      } as any);

      expect(mockAck).toHaveBeenCalled();
    });
  });
});
