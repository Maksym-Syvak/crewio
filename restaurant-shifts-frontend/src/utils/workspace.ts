import type { Restaurant, Workspace } from '@/types';

export function hasActiveWorkspace(
  restaurant: Restaurant | null,
  activeRestaurantId: string | null,
): boolean {
  return Boolean(
    restaurant && activeRestaurantId && restaurant.id === activeRestaurantId,
  );
}

export function restaurantFromSnapshot(snapshot: {
  id: string;
  name: string;
}): Restaurant {
  return {
    id: snapshot.id,
    owner_id: '',
    name: snapshot.name,
    address: '',
    type: 'restaurant',
    staff_count: 0,
    created_at: '',
  };
}

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
