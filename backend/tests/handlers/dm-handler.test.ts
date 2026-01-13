import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockWorkspace, createMockStandup } from '../setup.js';

// Mock services
vi.mock('../../src/services/workspace-service.js', () => ({
  getWorkspace: vi.fn(),
}));

vi.mock('../../src/services/standup-service.js', () => ({
  submitStandup: vi.fn(),
  getUserStandupsForDate: vi.fn(),
}));

// Import after mocking
import { getWorkspace } from '../../src/services/workspace-service.js';
import { submitStandup, getUserStandupsForDate } from '../../src/services/standup-service.js';
import { handleDirectMessage, parseUserCommand } from '../../src/handlers/dm-handler.js';

describe('DM Handler', () => {
  const mockClient = {
    chat: {
      postMessage: vi.fn().mockResolvedValue({ ok: true }),
    },
    users: {
      info: vi.fn().mockResolvedValue({
        ok: true,
        user: { real_name: 'Test User', id: 'U12345678' },
      }),
    },
  };

  const mockSay = vi.fn().mockResolvedValue({ ok: true });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleDirectMessage', () => {
    it('should acknowledge standup submission with checkmark', async () => {
      const mockWorkspace = createMockWorkspace();
      const mockStandup = createMockStandup({ content: 'Did some work' });

      vi.mocked(getWorkspace).mockResolvedValue(mockWorkspace);
      vi.mocked(submitStandup).mockResolvedValue(mockStandup);

      const event = {
        type: 'message',
        channel_type: 'im',
        text: 'Did some work today',
        user: 'U12345678',
        team: 'T12345678',
        channel: 'D12345678',
        ts: '1234567890.123456',
      };

      await handleDirectMessage({
        event,
        client: mockClient as any,
        say: mockSay,
      });

      expect(submitStandup).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: mockWorkspace.id,
          slackUserId: 'U12345678',
          content: 'Did some work today',
        })
      );
      expect(mockSay).toHaveBeenCalledWith('Got it! ✅');
    });

    it('should not process bot messages', async () => {
      const event = {
        type: 'message',
        channel_type: 'im',
        text: 'Bot message',
        user: 'U12345678',
        bot_id: 'B12345678',
        team: 'T12345678',
      };

      await handleDirectMessage({
        event,
        client: mockClient as any,
        say: mockSay,
      });

      expect(submitStandup).not.toHaveBeenCalled();
      expect(mockSay).not.toHaveBeenCalled();
    });

    it('should handle empty messages gracefully', async () => {
      const event = {
        type: 'message',
        channel_type: 'im',
        text: '',
        user: 'U12345678',
        team: 'T12345678',
      };

      await handleDirectMessage({
        event,
        client: mockClient as any,
        say: mockSay,
      });

      expect(submitStandup).not.toHaveBeenCalled();
    });

    it('should handle workspace not found error', async () => {
      vi.mocked(getWorkspace).mockResolvedValue(null);

      const event = {
        type: 'message',
        channel_type: 'im',
        text: 'Some work',
        user: 'U12345678',
        team: 'T12345678',
      };

      await handleDirectMessage({
        event,
        client: mockClient as any,
        say: mockSay,
      });

      expect(mockSay).toHaveBeenCalledWith(
        expect.stringContaining('not properly configured')
      );
    });
  });

  describe('parseUserCommand', () => {
    it('should detect skip command', () => {
      expect(parseUserCommand('skip today')).toEqual({ type: 'skip' });
      expect(parseUserCommand('SKIP TODAY')).toEqual({ type: 'skip' });
      expect(parseUserCommand('Skip')).toEqual({ type: 'skip' });
    });

    it('should detect vacation command with date', () => {
      const result = parseUserCommand('vacation until 2024-01-20');
      expect(result?.type).toBe('vacation');
      expect(result?.date).toBe('2024-01-20');
    });

    it('should detect done command', () => {
      expect(parseUserCommand('done')).toEqual({ type: 'done' });
      expect(parseUserCommand('DONE')).toEqual({ type: 'done' });
    });

    it('should detect help command', () => {
      expect(parseUserCommand('help')).toEqual({ type: 'help' });
      expect(parseUserCommand('?')).toEqual({ type: 'help' });
    });

    it('should return null for regular messages', () => {
      expect(parseUserCommand('Did some work today')).toBeNull();
      expect(parseUserCommand('Fixed bug in login flow')).toBeNull();
    });
  });
});
