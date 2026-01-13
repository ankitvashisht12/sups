import { eq, and, like } from 'drizzle-orm';
import {
  db,
  workspaces,
  reminders,
  standups,
  type Workspace,
  type Reminder,
} from '../db/index.js';

/**
 * Get workspaces that need reminders at the specified time
 * @param hour - Hour in 24h format (e.g., '19')
 * @param minute - Minute (e.g., '00')
 */
export async function getWorkspacesToRemind(
  hour: string,
  minute: string
): Promise<Workspace[]> {
  const timePattern = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}%`;

  const results = await db
    .select()
    .from(workspaces)
    .where(like(workspaces.reminderTime, timePattern));

  return results;
}

/**
 * Get workspaces that have reached their deadline
 */
export async function getWorkspacesAtDeadline(
  hour: string,
  minute: string
): Promise<Workspace[]> {
  const timePattern = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}%`;

  const results = await db
    .select()
    .from(workspaces)
    .where(like(workspaces.deadlineTime, timePattern));

  return results;
}

/**
 * Create a reminder entry for tracking
 */
export async function createReminder(
  workspaceId: string,
  scheduledDate: string
): Promise<Reminder> {
  const [reminder] = await db
    .insert(reminders)
    .values({
      workspaceId,
      scheduledDate,
      status: 'pending',
    })
    .returning();

  return reminder!;
}

/**
 * Mark a reminder as sent or failed
 */
export async function markReminderSent(
  workspaceId: string,
  scheduledDate: string,
  status: 'sent' | 'failed' = 'sent'
): Promise<Reminder | null> {
  const [reminder] = await db
    .update(reminders)
    .set({
      status,
      sentAt: status === 'sent' ? new Date() : null,
    })
    .where(
      and(
        eq(reminders.workspaceId, workspaceId),
        eq(reminders.scheduledDate, scheduledDate)
      )
    )
    .returning();

  return reminder ?? null;
}

/**
 * Get reminder status for a workspace and date
 */
export async function getReminderStatus(
  workspaceId: string,
  scheduledDate: string
): Promise<Reminder | null> {
  const [reminder] = await db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.workspaceId, workspaceId),
        eq(reminders.scheduledDate, scheduledDate)
      )
    );

  return reminder ?? null;
}

/**
 * Get set of users who have submitted for a date
 */
export async function getUsersWhoSubmitted(
  workspaceId: string,
  date: string
): Promise<Set<string>> {
  const results = await db
    .select()
    .from(standups)
    .where(and(eq(standups.workspaceId, workspaceId), eq(standups.date, date)));

  return new Set(results.map((s) => s.slackUserId));
}

/**
 * Check if reminder was already sent today for a workspace
 */
export async function wasReminderSentToday(workspaceId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]!;
  const reminder = await getReminderStatus(workspaceId, today);
  return reminder?.status === 'sent';
}

/**
 * Get or create reminder for today
 */
export async function getOrCreateTodayReminder(workspaceId: string): Promise<Reminder> {
  const today = new Date().toISOString().split('T')[0]!;
  const existing = await getReminderStatus(workspaceId, today);

  if (existing) {
    return existing;
  }

  return createReminder(workspaceId, today);
}
