import { eq } from 'drizzle-orm';
import { db, workspaces, type Workspace, type NewWorkspace } from '../db/index.js';

export interface CreateWorkspaceData {
  slackWorkspaceId: string;
  workspaceName?: string;
  botToken: string;
  botUserId?: string;
  installedBy?: string;
}

export interface UpdateWorkspaceConfig {
  standupChannelId?: string;
  reminderTime?: string;
  deadlineTime?: string;
  timezone?: string;
  workspaceName?: string;
}

/**
 * Create a new workspace when app is installed via OAuth
 */
export async function createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
  const [workspace] = await db
    .insert(workspaces)
    .values({
      slackWorkspaceId: data.slackWorkspaceId,
      workspaceName: data.workspaceName,
      botToken: data.botToken,
      botUserId: data.botUserId,
      installedBy: data.installedBy,
    })
    .returning();

  return workspace!;
}

/**
 * Get workspace by Slack workspace ID (team_id)
 */
export async function getWorkspace(slackWorkspaceId: string): Promise<Workspace | null> {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slackWorkspaceId, slackWorkspaceId));

  return workspace ?? null;
}

/**
 * Get workspace by internal UUID
 */
export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id));

  return workspace ?? null;
}

/**
 * Update workspace configuration
 */
export async function updateWorkspaceConfig(
  id: string,
  config: UpdateWorkspaceConfig
): Promise<Workspace | null> {
  const [workspace] = await db
    .update(workspaces)
    .set({
      ...config,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, id))
    .returning();

  return workspace ?? null;
}

/**
 * Delete workspace (when app is uninstalled)
 */
export async function deleteWorkspace(slackWorkspaceId: string): Promise<Workspace | null> {
  const [workspace] = await db
    .delete(workspaces)
    .where(eq(workspaces.slackWorkspaceId, slackWorkspaceId))
    .returning();

  return workspace ?? null;
}

/**
 * Get or create workspace - useful for handling reinstalls
 */
export async function getOrCreateWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
  const existing = await getWorkspace(data.slackWorkspaceId);

  if (existing) {
    // Update the token in case it changed
    const updated = await db
      .update(workspaces)
      .set({
        botToken: data.botToken,
        botUserId: data.botUserId,
        workspaceName: data.workspaceName,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.slackWorkspaceId, data.slackWorkspaceId))
      .returning();

    return updated[0]!;
  }

  return createWorkspace(data);
}
