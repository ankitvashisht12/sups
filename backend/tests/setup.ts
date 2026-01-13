import { vi, beforeEach, afterEach } from 'vitest';

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SLACK_SIGNING_SECRET = 'test-signing-secret';
process.env.SLACK_CLIENT_ID = 'test-client-id';
process.env.SLACK_CLIENT_SECRET = 'test-client-secret';
process.env.NODE_ENV = 'test';

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});

// Helper to create mock workspace data
export function createMockWorkspace(overrides = {}) {
  return {
    id: 'test-workspace-uuid',
    slackWorkspaceId: 'T12345678',
    workspaceName: 'Test Workspace',
    botToken: 'xoxb-test-token',
    botUserId: 'U12345678',
    standupChannelId: 'C12345678',
    reminderTime: '19:00:00',
    deadlineTime: '20:00:00',
    timezone: 'America/New_York',
    installedBy: 'U00000001',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Helper to create mock user data
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-uuid',
    slackUserId: 'U12345678',
    workspaceId: 'test-workspace-uuid',
    userName: 'Test User',
    isAdmin: false,
    isOnLeave: false,
    leaveUntil: null,
    reminderOffset: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Helper to create mock standup data
export function createMockStandup(overrides = {}) {
  return {
    id: 'test-standup-uuid',
    workspaceId: 'test-workspace-uuid',
    slackUserId: 'U12345678',
    userName: 'Test User',
    content: 'Did some work today',
    date: new Date().toISOString().split('T')[0],
    isLate: false,
    postedToChannel: false,
    threadTs: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// Helper to create mock reminder data
export function createMockReminder(overrides = {}) {
  return {
    id: 'test-reminder-uuid',
    workspaceId: 'test-workspace-uuid',
    scheduledDate: new Date().toISOString().split('T')[0],
    sentAt: null,
    status: 'pending',
    createdAt: new Date(),
    ...overrides,
  };
}
