import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store';
import {
  needsProfileSetup,
  needsVenueSetup,
} from '@/store/onboarding';

/** Blocks main app until profile + venue setup is done. */
export function OnboardingGuard() {
  const user = useAuthStore((s) => s.user);
  const restaurant = useAuthStore((s) => s.restaurant);
  const employee = useAuthStore((s) => s.employee);
  const contextLoaded = useAuthStore((s) => s.contextLoaded);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated || !user) {
    return <Navigate to="/splash" replace />;
  }

  if (needsProfileSetup(user)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (needsVenueSetup(user, restaurant, employee, contextLoaded)) {
    if (user.role === 'employee') {
      return <Navigate to="/onboarding/join" replace />;
    }
    return <Navigate to="/onboarding/create-restaurant" replace />;
  }

  return <Outlet />;
}

/** Keeps user inside onboarding until profile/venue steps are finished. */
export function OnboardingOnlyGuard() {
  const user = useAuthStore((s) => s.user);
  const restaurant = useAuthStore((s) => s.restaurant);
  const employee = useAuthStore((s) => s.employee);
  const contextLoaded = useAuthStore((s) => s.contextLoaded);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated || !user) {
    return <Navigate to="/splash" replace />;
  }

  if (
    user.is_profile_completed &&
    !needsVenueSetup(user, restaurant, employee, contextLoaded)
  ) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
