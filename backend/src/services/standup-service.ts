import { eq, and, inArray, asc } from 'drizzle-orm';
import { db, standups, type Standup, type NewStandup } from '../db/index.js';

export interface SubmitStandupData {
  workspaceId: string;
  slackUserId: string;
  userName?: string;
  content: string;
  date?: string;
  isLate?: boolean;
}

export interface SubmissionStatus {
  submitted: string[];
  late: string[];
  userNames: Record<string, string>;
}

/**
 * Submit a standup update
 */
export async function submitStandup(data: SubmitStandupData): Promise<Standup> {
  const today = new Date().toISOString().split('T')[0]!;

  const [standup] = await db
    .insert(standups)
    .values({
      workspaceId: data.workspaceId,
      slackUserId: data.slackUserId,
      userName: data.userName,
      content: data.content,
      date: data.date ?? today,
      isLate: data.isLate ?? false,
    })
    .returning();

  return standup!;
}

/**
 * Get all standups for a workspace on a specific date
 */
export async function getStandupsForDate(
  workspaceId: string,
  date: string
): Promise<Standup[]> {
  const results = await db
    .select()
    .from(standups)
    .where(and(eq(standups.workspaceId, workspaceId), eq(standups.date, date)));

  return results;
}

/**
 * Get all standups for a specific user on a date
 */
export async function getUserStandupsForDate(
  workspaceId: string,
  slackUserId: string,
  date: string
): Promise<Standup[]> {
  const results = await db
    .select()
    .from(standups)
    .where(
      and(
        eq(standups.workspaceId, workspaceId),
        eq(standups.slackUserId, slackUserId),
        eq(standups.date, date)
      )
    );

  return results;
}

/**
 * Aggregate all standups from a user on a date into a single string
 */
export async function aggregateUserStandups(
  workspaceId: string,
  slackUserId: string,
  date: string
): Promise<string> {
  const results = await db
    .select()
    .from(standups)
    .where(
      and(
        eq(standups.workspaceId, workspaceId),
        eq(standups.slackUserId, slackUserId),
        eq(standups.date, date)
      )
    )
    .orderBy(asc(standups.createdAt));

  if (results.length === 0) {
    return '';
  }

  return results.map((s) => s.content).join('\n\n');
}

/**
 * Mark standups as posted to the channel
 */
export async function markAsPosted(
  standupIds: string[],
  threadTs: string
): Promise<Standup[]> {
  const results = await db
    .update(standups)
    .set({
      postedToChannel: true,
      threadTs,
    })
    .where(inArray(standups.id, standupIds))
    .returning();

  return results;
}

/**
 * Get submission status for a date
 * Returns who has submitted and who submitted late
 */
export async function getSubmissionStatus(
  workspaceId: string,
  date: string
): Promise<SubmissionStatus> {
  const results = await db
    .select()
    .from(standups)
    .where(and(eq(standups.workspaceId, workspaceId), eq(standups.date, date)));

  const submitted: string[] = [];
  const late: string[] = [];
  const userNames: Record<string, string> = {};

  // Get unique users
  const seenUsers = new Set<string>();

  for (const standup of results) {
    if (!seenUsers.has(standup.slackUserId)) {
      seenUsers.add(standup.slackUserId);
      submitted.push(standup.slackUserId);

      if (standup.userName) {
        userNames[standup.slackUserId] = standup.userName;
      }

      if (standup.isLate) {
        late.push(standup.slackUserId);
      }
    }
  }

  return { submitted, late, userNames };
}

/**
 * Get standups that haven't been posted to the channel yet
 */
export async function getUnpostedStandups(
  workspaceId: string,
  date: string
): Promise<Standup[]> {
  const results = await db
    .select()
    .from(standups)
    .where(
      and(
        eq(standups.workspaceId, workspaceId),
        eq(standups.date, date),
        eq(standups.postedToChannel, false)
      )
    )
    .orderBy(asc(standups.createdAt));

  return results;
}

/**
 * Check if user has already submitted today
 */
export async function hasUserSubmittedToday(
  workspaceId: string,
  slackUserId: string
): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]!;
  const results = await getUserStandupsForDate(workspaceId, slackUserId, today);
  return results.length > 0;
}
