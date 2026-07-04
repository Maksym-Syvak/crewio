import type { Workspace } from '@/types';

export function needsWorkspaceSelection(
  workspaces: Workspace[],
  activeRestaurantId: string | null,
  contextLoaded: boolean,
): boolean {
  if (!contextLoaded) return false;
  if (workspaces.length <= 1) return false;
  if (!activeRestaurantId) return true;
  return !workspaces.some((w) => w.restaurant.id === activeRestaurantId);
}
