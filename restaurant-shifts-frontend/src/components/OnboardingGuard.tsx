import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store';
import {
  effectiveOnboardingRole,
  needsProfileSetup,
  needsVenueSetup,
  useOnboardingStore,
} from '@/store/onboarding';

/** Blocks main app until profile + venue setup is done. */
export function OnboardingGuard() {
  const user = useAuthStore((s) => s.user);
  const workspaces = useAuthStore((s) => s.workspaces);
  const contextLoaded = useAuthStore((s) => s.contextLoaded);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const profileSubmitted = useOnboardingStore((s) => s.profileSubmitted);
  const selectedRole = useOnboardingStore((s) => s.selectedRole);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (needsProfileSetup(user, profileSubmitted)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (needsVenueSetup(user, workspaces, contextLoaded, profileSubmitted)) {
    const role = effectiveOnboardingRole(user, selectedRole, profileSubmitted);
    if (role === 'employee') {
      return <Navigate to="/onboarding/join" replace />;
    }
    return <Navigate to="/onboarding/create-restaurant" replace />;
  }

  return <Outlet />;
}

/** Keeps user inside onboarding until profile/venue steps are finished. */
export function OnboardingOnlyGuard() {
  const user = useAuthStore((s) => s.user);
  const workspaces = useAuthStore((s) => s.workspaces);
  const contextLoaded = useAuthStore((s) => s.contextLoaded);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const profileSubmitted = useOnboardingStore((s) => s.profileSubmitted);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (
    !needsProfileSetup(user, profileSubmitted) &&
    !needsVenueSetup(user, workspaces, contextLoaded, profileSubmitted)
  ) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
