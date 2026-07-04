import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { PageSkeleton } from '@/components/Skeleton';
import { needsWorkspaceSelection } from '@/utils/workspace';

/** Blocks main app until workspace context is loaded and an active workspace is chosen. */
export function WorkspaceReadyGuard() {
  const contextLoaded = useAuthStore((s) => s.contextLoaded);
  const workspaces = useAuthStore((s) => s.workspaces);
  const activeRestaurantId = useAuthStore((s) => s.activeRestaurantId);
  const restaurant = useAuthStore((s) => s.restaurant);

  const hasCachedActiveWorkspace =
    !contextLoaded &&
    Boolean(restaurant) &&
    Boolean(activeRestaurantId) &&
    restaurant?.id === activeRestaurantId;

  if (!contextLoaded && !hasCachedActiveWorkspace) {
    return <PageSkeleton />;
  }

  if (
    contextLoaded &&
    needsWorkspaceSelection(workspaces, activeRestaurantId, contextLoaded)
  ) {
    return <Navigate to="/workspaces" replace />;
  }

  return <Outlet />;
}
