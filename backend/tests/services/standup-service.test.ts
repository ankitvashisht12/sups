import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockStandup } from '../setup.js';

// Mock database module - factory must not reference external variables
vi.mock('../../src/db/index.js', () => {
  return {
    db: {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    standups: { id: 'id', workspaceId: 'workspace_id', slackUserId: 'slack_user_id', date: 'date' },
    workspaces: { id: 'id' },
  };
});

// Import after mocking
import { db } from '../../src/db/index.js';
import {
  submitStandup,
  getStandupsForDate,
  getUserStandupsForDate,
  aggregateUserStandups,
  markAsPosted,
  getSubmissionStatus,
} from '../../src/services/standup-service.js';

describe('StandupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitStandup', () => {
    it('should create a new standup entry', async () => {
      const standupData = {
        workspaceId: 'test-workspace-uuid',
        slackUserId: 'U12345678',
        userName: 'Test User',
        content: 'Worked on feature X today',
      };

      const mockStandup = createMockStandup(standupData);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockStandup]),
        }),
      } as any);

      const result = await submitStandup(standupData);

      expect(db.insert).toHaveBeenCalled();
      expect(result.content).toBe('Worked on feature X today');
      expect(result.slackUserId).toBe('U12345678');
    });

    it('should set isLate to true if submitted after deadline', async () => {
      const standupData = {
        workspaceId: 'test-workspace-uuid',
        slackUserId: 'U12345678',
        content: 'Late submission',
        isLate: true,
      };

      const mockStandup = createMockStandup({ ...standupData, isLate: true });

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockStandup]),
        }),
      } as any);

      const result = await submitStandup(standupData);

      expect(result.isLate).toBe(true);
    });

    it('should use current date if not provided', async () => {
      const today = new Date().toISOString().split('T')[0];
      const standupData = {
        workspaceId: 'test-workspace-uuid',
        slackUserId: 'U12345678',
        content: 'Some work',
      };

      const mockStandup = createMockStandup({ ...standupData, date: today });

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockStandup]),
        }),
      } as any);

      const result = await submitStandup(standupData);

      expect(result.date).toBe(today);
    });
  });

  describe('getStandupsForDate', () => {
    it('should return all standups for a workspace on a given date', async () => {
      const date = '2024-01-15';
      const mockStandups = [
        createMockStandup({ slackUserId: 'U11111111', content: 'Work 1' }),
        createMockStandup({ slackUserId: 'U22222222', content: 'Work 2' }),
        createMockStandup({ slackUserId: 'U33333333', content: 'Work 3' }),
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockStandups),
        }),
      } as any);

      const result = await getStandupsForDate('test-workspace-uuid', date);

      expect(result).toHaveLength(3);
      expect(result[0]?.content).toBe('Work 1');
    });

    it('should return empty array if no standups for date', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await getStandupsForDate('test-workspace-uuid', '2024-01-15');

      expect(result).toHaveLength(0);
    });
  });

  describe('getUserStandupsForDate', () => {
    it('should return all standups for a specific user on a date', async () => {
      const mockStandups = [
        createMockStandup({ content: 'Morning update' }),
        createMockStandup({ content: 'Afternoon update' }),
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockStandups),
        }),
      } as any);

      const result = await getUserStandupsForDate(
        'test-workspace-uuid',
        'U12345678',
        '2024-01-15'
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('aggregateUserStandups', () => {
    it('should combine multiple messages into one string', async () => {
      const mockStandups = [
        createMockStandup({ content: 'Morning: fixed bug' }),
        createMockStandup({ content: 'Afternoon: code review' }),
        createMockStandup({ content: 'Evening: deployed changes' }),
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockStandups),
          }),
        }),
      } as any);

      const result = await aggregateUserStandups(
        'test-workspace-uuid',
        'U12345678',
        '2024-01-15'
      );

      expect(result).toContain('Morning: fixed bug');
      expect(result).toContain('Afternoon: code review');
      expect(result).toContain('Evening: deployed changes');
    });

    it('should return empty string if no standups', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await aggregateUserStandups(
        'test-workspace-uuid',
        'U12345678',
        '2024-01-15'
      );

      expect(result).toBe('');
    });
  });

  describe('markAsPosted', () => {
    it('should mark standups as posted to channel', async () => {
      const standupIds = ['standup-1', 'standup-2'];
      const threadTs = '1234567890.123456';

      const mockUpdatedStandups = standupIds.map((id) =>
        createMockStandup({ id, postedToChannel: true, threadTs })
      );

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(mockUpdatedStandups),
          }),
        }),
      } as any);

      const result = await markAsPosted(standupIds, threadTs);

      expect(db.update).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]?.postedToChannel).toBe(true);
      expect(result[0]?.threadTs).toBe(threadTs);
    });
  });

  describe('getSubmissionStatus', () => {
    it('should return list of users who submitted', async () => {
      const mockStandups = [
        createMockStandup({ slackUserId: 'U11111111', userName: 'Alice' }),
        createMockStandup({ slackUserId: 'U22222222', userName: 'Bob' }),
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockStandups),
        }),
      } as any);

      const result = await getSubmissionStatus('test-workspace-uuid', '2024-01-15');

      expect(result.submitted).toContain('U11111111');
      expect(result.submitted).toContain('U22222222');
    });

    it('should identify late submissions', async () => {
      const mockStandups = [
        createMockStandup({ slackUserId: 'U11111111', isLate: false }),
        createMockStandup({ slackUserId: 'U22222222', isLate: true }),
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockStandups),
        }),
      } as any);

      const result = await getSubmissionStatus('test-workspace-uuid', '2024-01-15');

      expect(result.late).toContain('U22222222');
      expect(result.late).not.toContain('U11111111');
    });
  });
});
