import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockWorkspace, createMockReminder, createMockStandup } from '../setup.js';

// Mock database module - factory must not reference external variables
vi.mock('../../src/db/index.js', () => {
  return {
    db: {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workspaces: { id: 'id', reminderTime: 'reminder_time', timezone: 'timezone' },
    reminders: { id: 'id', workspaceId: 'workspace_id', scheduledDate: 'scheduled_date' },
    standups: { id: 'id', workspaceId: 'workspace_id', date: 'date' },
  };
});

// Import after mocking
import { db } from '../../src/db/index.js';
import {
  getWorkspacesToRemind,
  createReminder,
  markReminderSent,
  getReminderStatus,
  getUsersWhoSubmitted,
} from '../../src/services/reminder-service.js';

describe('ReminderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWorkspacesToRemind', () => {
    it('should return workspaces with matching reminder time', async () => {
      const mockWorkspaces = [
        createMockWorkspace({ reminderTime: '19:00:00', timezone: 'America/New_York' }),
        createMockWorkspace({
          id: 'workspace-2',
          slackWorkspaceId: 'T22222222',
          reminderTime: '19:00:00',
          timezone: 'America/New_York',
        }),
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockWorkspaces),
        }),
      } as any);

      const result = await getWorkspacesToRemind('19', '00');

      expect(db.select).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no workspaces match the time', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await getWorkspacesToRemind('15', '00');

      expect(result).toHaveLength(0);
    });
  });

  describe('createReminder', () => {
    it('should create a new reminder entry', async () => {
      const today = new Date().toISOString().split('T')[0]!;
      const mockReminder = createMockReminder({
        workspaceId: 'test-workspace-uuid',
        scheduledDate: today,
        status: 'pending',
      });

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockReminder]),
        }),
      } as any);

      const result = await createReminder('test-workspace-uuid', today);

      expect(db.insert).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });
  });

  describe('markReminderSent', () => {
    it('should update reminder status to sent', async () => {
      const mockReminder = createMockReminder({
        status: 'sent',
        sentAt: new Date(),
      });

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockReminder]),
          }),
        }),
      } as any);

      const result = await markReminderSent('test-workspace-uuid', '2024-01-15');

      expect(db.update).toHaveBeenCalled();
      expect(result?.status).toBe('sent');
      expect(result?.sentAt).toBeDefined();
    });

    it('should update reminder status to failed on error', async () => {
      const mockReminder = createMockReminder({
        status: 'failed',
      });

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockReminder]),
          }),
        }),
      } as any);

      const result = await markReminderSent('test-workspace-uuid', '2024-01-15', 'failed');

      expect(result?.status).toBe('failed');
    });
  });

  describe('getReminderStatus', () => {
    it('should return reminder for a workspace and date', async () => {
      const mockReminder = createMockReminder({
        status: 'sent',
      });

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockReminder]),
        }),
      } as any);

      const result = await getReminderStatus('test-workspace-uuid', '2024-01-15');

      expect(result).not.toBeNull();
      expect(result?.status).toBe('sent');
    });

    it('should return null if no reminder exists', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await getReminderStatus('test-workspace-uuid', '2024-01-15');

      expect(result).toBeNull();
    });
  });

  describe('getUsersWhoSubmitted', () => {
    it('should return set of user IDs who submitted', async () => {
      const mockStandups = [
        createMockStandup({ slackUserId: 'U11111111' }),
        createMockStandup({ slackUserId: 'U22222222' }),
        createMockStandup({ slackUserId: 'U11111111' }), // Duplicate
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockStandups),
        }),
      } as any);

      const result = await getUsersWhoSubmitted('test-workspace-uuid', '2024-01-15');

      expect(result.size).toBe(2);
      expect(result.has('U11111111')).toBe(true);
      expect(result.has('U22222222')).toBe(true);
    });

    it('should return empty set if no submissions', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await getUsersWhoSubmitted('test-workspace-uuid', '2024-01-15');

      expect(result.size).toBe(0);
    });
  });
});
