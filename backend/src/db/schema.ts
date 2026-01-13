import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  time,
  boolean,
  integer,
  unique,
} from 'drizzle-orm/pg-core';

// workspaces - one per Slack workspace that installs the app
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  slackWorkspaceId: text('slack_workspace_id').notNull().unique(),
  workspaceName: text('workspace_name'),
  botToken: text('bot_token').notNull(),
  botUserId: text('bot_user_id'),
  standupChannelId: text('standup_channel_id'),
  reminderTime: time('reminder_time').default('19:00:00'),
  deadlineTime: time('deadline_time').default('20:00:00'),
  timezone: text('timezone').default('America/New_York'),
  installedBy: text('installed_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// users - track user preferences and status
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slackUserId: text('slack_user_id').notNull(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userName: text('user_name'),
    isAdmin: boolean('is_admin').default(false),
    isOnLeave: boolean('is_on_leave').default(false),
    leaveUntil: date('leave_until'),
    reminderOffset: integer('reminder_offset').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [unique('unique_user_per_workspace').on(table.slackUserId, table.workspaceId)]
);

// standups - the actual standup submissions
export const standups = pgTable('standups', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  slackUserId: text('slack_user_id').notNull(),
  userName: text('user_name'),
  content: text('content').notNull(),
  date: date('date').notNull(),
  isLate: boolean('is_late').default(false),
  postedToChannel: boolean('posted_to_channel').default(false),
  threadTs: text('thread_ts'),
  createdAt: timestamp('created_at').defaultNow(),
});

// reminders - track sent reminders
export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  scheduledDate: date('scheduled_date').notNull(),
  sentAt: timestamp('sent_at'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Type exports for use in services
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Standup = typeof standups.$inferSelect;
export type NewStandup = typeof standups.$inferInsert;

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
