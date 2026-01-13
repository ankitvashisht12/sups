import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockWorkspace } from '../setup.js';

// Mock database module - factory must not reference external variables
vi.mock('../../src/db/index.js', () => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      delete: mockDelete,
    },
    workspaces: { id: 'id', slackWorkspaceId: 'slack_workspace_id' },
  };
});

// Import after mocking
import { db } from '../../src/db/index.js';
import {
  createWorkspace,
  getWorkspace,
  getWorkspaceById,
  updateWorkspaceConfig,
  deleteWorkspace,
} from '../../src/services/workspace-service.js';

describe('WorkspaceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('should create a new workspace with OAuth data', async () => {
      const oauthData = {
        slackWorkspaceId: 'T12345678',
        workspaceName: 'Test Workspace',
        botToken: 'xoxb-test-token',
        botUserId: 'U12345678',
        installedBy: 'U00000001',
      };

      const mockWorkspace = createMockWorkspace(oauthData);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockWorkspace]),
        }),
      } as any);

      const result = await createWorkspace(oauthData);

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockWorkspace);
      expect(result.slackWorkspaceId).toBe('T12345678');
      expect(result.botToken).toBe('xoxb-test-token');
    });

    it('should set default values for reminder and deadline times', async () => {
      const oauthData = {
        slackWorkspaceId: 'T12345678',
        workspaceName: 'Test Workspace',
        botToken: 'xoxb-test-token',
        botUserId: 'U12345678',
        installedBy: 'U00000001',
      };

      const mockWorkspace = createMockWorkspace({
        ...oauthData,
        reminderTime: '19:00:00',
        deadlineTime: '20:00:00',
        timezone: 'America/New_York',
      });

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockWorkspace]),
        }),
      } as any);

      const result = await createWorkspace(oauthData);

      expect(result.reminderTime).toBe('19:00:00');
      expect(result.deadlineTime).toBe('20:00:00');
      expect(result.timezone).toBe('America/New_York');
    });
  });

  describe('getWorkspace', () => {
    it('should return workspace by Slack workspace ID', async () => {
      const mockWorkspace = createMockWorkspace();

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockWorkspace]),
        }),
      } as any);

      const result = await getWorkspace('T12345678');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockWorkspace);
    });

    it('should return null if workspace not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await getWorkspace('T99999999');

      expect(result).toBeNull();
    });
  });

  describe('getWorkspaceById', () => {
    it('should return workspace by internal UUID', async () => {
      const mockWorkspace = createMockWorkspace();

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockWorkspace]),
        }),
      } as any);

      const result = await getWorkspaceById('test-workspace-uuid');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockWorkspace);
    });
  });

  describe('updateWorkspaceConfig', () => {
    it('should update workspace configuration', async () => {
      const updatedWorkspace = createMockWorkspace({
        standupChannelId: 'C99999999',
        reminderTime: '18:00:00',
      });

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedWorkspace]),
          }),
        }),
      } as any);

      const result = await updateWorkspaceConfig('test-workspace-uuid', {
        standupChannelId: 'C99999999',
        reminderTime: '18:00:00',
      });

      expect(db.update).toHaveBeenCalled();
      expect(result?.standupChannelId).toBe('C99999999');
      expect(result?.reminderTime).toBe('18:00:00');
    });

    it('should update the updatedAt timestamp', async () => {
      const now = new Date();
      const updatedWorkspace = createMockWorkspace({
        updatedAt: now,
      });

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedWorkspace]),
          }),
        }),
      } as any);

      const result = await updateWorkspaceConfig('test-workspace-uuid', {
        standupChannelId: 'C99999999',
      });

      expect(result?.updatedAt).toBeDefined();
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete workspace by Slack workspace ID', async () => {
      const mockWorkspace = createMockWorkspace();

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockWorkspace]),
        }),
      } as any);

      const result = await deleteWorkspace('T12345678');

      expect(db.delete).toHaveBeenCalled();
      expect(result).toEqual(mockWorkspace);
    });

    it('should return null if workspace to delete not found', async () => {
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await deleteWorkspace('T99999999');

      expect(result).toBeNull();
    });
  });
});
