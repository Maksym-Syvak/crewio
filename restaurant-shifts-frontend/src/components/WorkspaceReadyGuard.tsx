import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { PageSkeleton } from '@/components/Skeleton';
import { ConnectionErrorScreen } from '@/components/ConnectionErrorScreen';
import { hasActiveWorkspace, needsWorkspaceSelection } from '@/utils/workspace';

/** Blocks main app until workspace context is loaded and an active workspace is chosen. */
export function WorkspaceReadyGuard() {
  const contextLoaded = useAuthStore((s) => s.contextLoaded);
  const contextLoadError = useAuthStore((s) => s.contextLoadError);
  const contextLoadInProgress = useAuthStore((s) => s.contextLoadInProgress);
  const retryLoadContext = useAuthStore((s) => s.retryLoadContext);
  const workspaces = useAuthStore((s) => s.workspaces);
  const activeRestaurantId = useAuthStore((s) => s.activeRestaurantId);
  const restaurant = useAuthStore((s) => s.restaurant);

  const hasCachedActiveWorkspace =
    !contextLoaded && hasActiveWorkspace(restaurant, activeRestaurantId);

  const hasActiveWorkspaceReady = hasActiveWorkspace(restaurant, activeRestaurantId);

  if (
    contextLoaded &&
    contextLoadError &&
    !hasActiveWorkspaceReady
  ) {
    return (
      <ConnectionErrorScreen
        onRetry={() => void retryLoadContext()}
        retrying={contextLoadInProgress}
      />
    );
  }

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
