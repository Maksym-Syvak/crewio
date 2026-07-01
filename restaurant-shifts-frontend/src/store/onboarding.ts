import { create } from 'zustand';
import type { UserRole } from '@/types';

interface OnboardingState {
  selectedRole: UserRole | null;
  setSelectedRole: (role: UserRole) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  selectedRole: null,
  setSelectedRole: (role) => set({ selectedRole: role }),
  reset: () => set({ selectedRole: null }),
}));

export function needsProfileSetup(user: { is_profile_completed?: boolean } | null) {
  return Boolean(user && !user.is_profile_completed);
}

export function needsVenueSetup(
  user: { role: UserRole; is_profile_completed?: boolean } | null,
  restaurant: unknown,
  employee: unknown,
  contextLoaded: boolean,
) {
  if (!user?.is_profile_completed || !contextLoaded) return false;
  return !restaurant && !employee;
}
