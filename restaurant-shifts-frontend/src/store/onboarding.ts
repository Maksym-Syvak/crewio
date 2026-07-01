import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/types';
import type { CreateRestaurantPayload } from '@/api/restaurants.api';
import { useAuthStore } from '@/store';

export type OnboardingStep =
  | 'welcome'
  | 'role'
  | 'profile'
  | 'join'
  | 'create'
  | 'invite';

export interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
}

export const ONBOARDING_PATHS = {
  welcome: '/onboarding',
  role: '/onboarding/role',
  profile: '/onboarding/profile',
  join: '/onboarding/join',
  create: '/onboarding/create-restaurant',
  invite: '/onboarding/invite',
} as const;

export const ROLE_LABELS: Record<
  UserRole,
  { icon: string; title: string }
> = {
  employee: { icon: '👨‍🍳', title: 'Працівник' },
  admin: { icon: '👨‍💼', title: 'Адміністратор' },
  owner: { icon: '👑', title: 'Власник' },
};

interface OnboardingState {
  currentStep: OnboardingStep;
  selectedRole: UserRole | null;
  profileData: ProfileData | null;
  restaurantData: Partial<CreateRestaurantPayload> | null;
  inviteCode: string;
  profileSubmitted: boolean;

  setCurrentStep: (step: OnboardingStep) => void;
  setSelectedRole: (role: UserRole) => void;
  setProfileData: (data: ProfileData) => void;
  setRestaurantData: (data: Partial<CreateRestaurantPayload>) => void;
  setInviteCode: (code: string) => void;
  markProfileSubmitted: () => void;
  reset: () => void;
}

const initialState = {
  currentStep: 'welcome' as OnboardingStep,
  selectedRole: null as UserRole | null,
  profileData: null as ProfileData | null,
  restaurantData: null as Partial<CreateRestaurantPayload> | null,
  inviteCode: '',
  profileSubmitted: false,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentStep: (step) => set({ currentStep: step }),
      setSelectedRole: (role) => set({ selectedRole: role }),
      setProfileData: (data) => set({ profileData: data }),
      setRestaurantData: (data) =>
        set((s) => ({
          restaurantData: { ...(s.restaurantData ?? {}), ...data },
        })),
      setInviteCode: (code) => set({ inviteCode: code }),
      markProfileSubmitted: () => set({ profileSubmitted: true }),
      reset: () => set({ ...initialState }),
    }),
    { name: 'crewio-onboarding' },
  ),
);

export function pathToStep(pathname: string): OnboardingStep {
  if (pathname.endsWith('/role')) return 'role';
  if (pathname.endsWith('/profile')) return 'profile';
  if (pathname.endsWith('/join')) return 'join';
  if (pathname.endsWith('/create-restaurant')) return 'create';
  if (pathname.endsWith('/invite')) return 'invite';
  return 'welcome';
}

export function getBackPath(pathname: string): string | null {
  const step = pathToStep(pathname);
  switch (step) {
    case 'role':
      return ONBOARDING_PATHS.welcome;
    case 'profile':
      return ONBOARDING_PATHS.role;
    case 'join':
    case 'create':
      return ONBOARDING_PATHS.role;
    case 'invite':
      return ONBOARDING_PATHS.create;
    default:
      return null;
  }
}

export function needsProfileSetup(
  user: { is_profile_completed?: boolean } | null,
  profileSubmitted = false,
) {
  return Boolean(user && !user.is_profile_completed && !profileSubmitted);
}

export function needsVenueSetup(
  user: { role: UserRole; is_profile_completed?: boolean } | null,
  restaurant: unknown,
  employee: unknown,
  contextLoaded: boolean,
  profileSubmitted = false,
) {
  const profileDone = Boolean(user?.is_profile_completed || profileSubmitted);
  if (!profileDone) return false;

  const role = effectiveOnboardingRole(
    user,
    useOnboardingStore.getState().selectedRole,
    profileSubmitted,
  );

  if (role === 'employee') {
    if (profileSubmitted && !employee) return true;
    if (!contextLoaded) return false;
    return !employee;
  }

  if (profileSubmitted && !restaurant) return true;
  if (!contextLoaded) return false;
  return !restaurant;
}

export function effectiveOnboardingRole(
  user: { role: UserRole } | null,
  selectedRole: UserRole | null,
  profileSubmitted: boolean,
): UserRole {
  if (profileSubmitted && selectedRole) return selectedRole;
  return user?.role ?? 'employee';
}

export function getPostLoginPath(): string {
  const { user, restaurant, employee, contextLoaded } =
    useAuthStore.getState();
  const { profileSubmitted, selectedRole } = useOnboardingStore.getState();

  if (needsProfileSetup(user, profileSubmitted)) {
    return ONBOARDING_PATHS.welcome;
  }

  if (
    needsVenueSetup(
      user,
      restaurant,
      employee,
      contextLoaded,
      profileSubmitted,
    )
  ) {
    const role = effectiveOnboardingRole(user, selectedRole, profileSubmitted);
    return role === 'employee'
      ? ONBOARDING_PATHS.join
      : ONBOARDING_PATHS.create;
  }

  return '/';
}

export async function ensureOnboardingProfileComplete() {
  const { user, completeProfile } = useAuthStore.getState();
  const { profileData, selectedRole } = useOnboardingStore.getState();

  if (!profileData || !selectedRole) {
    throw new Error('Спочатку заповніть профіль');
  }

  const needsSync =
    !user?.is_profile_completed ||
    user.role !== selectedRole ||
    user.first_name !== profileData.first_name ||
    user.last_name !== profileData.last_name ||
    user.phone !== profileData.phone;

  if (needsSync) {
    await completeProfile({ ...profileData, role: selectedRole });
  }
}
