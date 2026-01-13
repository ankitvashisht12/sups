import type { Installation, InstallationQuery } from '@slack/oauth';
import { getOrCreateWorkspace, getWorkspace, deleteWorkspace } from '../services/workspace-service.js';

/**
 * Store installation data when app is installed or reinstalled
 */
export async function storeInstallation(installation: Installation): Promise<void> {
  // Handle both org-wide and workspace installations
  const teamId = installation.team?.id;
  const teamName = installation.team?.name;
  const botToken = installation.bot?.token;
  const botUserId = installation.bot?.userId;
  const installedBy = installation.user?.id;

  if (!teamId || !botToken) {
    throw new Error('Missing required installation data');
  }

  await getOrCreateWorkspace({
    slackWorkspaceId: teamId,
    workspaceName: teamName,
    botToken,
    botUserId,
    installedBy,
  });

  console.log(`App installed/reinstalled for workspace: ${teamName} (${teamId})`);
}

/**
 * Fetch installation data for API calls
 */
export async function fetchInstallation(
  query: InstallationQuery<boolean>
): Promise<Installation> {
  const teamId = query.teamId;

  if (!teamId) {
    throw new Error('Team ID is required');
  }

  const workspace = await getWorkspace(teamId);

  if (!workspace) {
    throw new Error(`Installation not found for team: ${teamId}`);
  }

  // Return installation object that Bolt expects
  return {
    team: {
      id: workspace.slackWorkspaceId,
      name: workspace.workspaceName ?? undefined,
    },
    enterprise: undefined,
    bot: {
      token: workspace.botToken,
      userId: workspace.botUserId ?? '',
      scopes: [
        'app_mentions:read',
        'channels:read',
        'chat:write',
        'im:history',
        'im:read',
        'im:write',
        'users:read',
      ],
      id: '',
    },
    user: {
      id: workspace.installedBy ?? '',
      token: undefined,
      scopes: undefined,
    },
  } as Installation;
}

/**
 * Delete installation when app is uninstalled
 */
export async function deleteInstallation(
  query: InstallationQuery<boolean>
): Promise<void> {
  const teamId = query.teamId;

  if (!teamId) {
    throw new Error('Team ID is required');
  }

  await deleteWorkspace(teamId);
  console.log(`App uninstalled from workspace: ${teamId}`);
}

/**
 * Handle app_uninstalled event
 */
export async function handleAppUninstalled(teamId: string): Promise<void> {
  await deleteWorkspace(teamId);
  console.log(`Received app_uninstalled event for: ${teamId}`);
}

/**
 * Handle tokens_revoked event
 */
export async function handleTokensRevoked(
  teamId: string,
  _userIds: string[]
): Promise<void> {
  // For now, treat this the same as uninstall
  // In the future, might want to just remove specific user tokens
  await deleteWorkspace(teamId);
  console.log(`Tokens revoked for workspace: ${teamId}`);
}
