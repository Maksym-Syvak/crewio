import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AuthResponse,
  Employee,
  InvitationToken,
  Notification,
  Restaurant,
  Shift,
  ToastMessage,
  User,
  UserRole,
  Workspace,
} from '@/types';
import { authApi, type CompleteProfilePayload, type CheckUserResponse } from '@/api/auth.api';
import { restaurantsApi, inviteApi, type CreateRestaurantPayload } from '@/api/restaurants.api';
import { employeesApi } from '@/api/employees.api';
import { shiftsApi } from '@/api/shifts.api';
import { notificationsApi } from '@/api/notifications.api';
import { getErrorMessage, withRetry } from '@/api/client';
import { withAuthTimeout } from '@/utils/async';
import { beginFreshTelegramAuth } from '@/utils/session';

function sessionFromAuth(res: AuthResponse) {
  return {
    token: res.accessToken,
    refreshToken: res.refreshToken,
    tokenExpiresAt: Date.now() + res.expiresIn * 1000,
    user: res.user,
    isAuthenticated: true,
    employee: null,
    restaurant: null,
    activeInvitation: null,
    contextLoaded: false,
  };
}

interface WorkspaceCache {
  workspaces: Workspace[];
  restaurant: Restaurant;
  employee: Employee | null;
  workspaceRole: UserRole | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  employee: Employee | null;
  restaurant: Restaurant | null;
  workspaces: Workspace[];
  activeRestaurantId: string | null;
  workspaceRole: UserRole | null;
  activeInvitation: InvitationToken | null;
  contextLoaded: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setSession: (res: AuthResponse) => void;
  refreshAccessToken: () => Promise<string>;
  login: () => Promise<void>;
  register: () => Promise<void>;
  restoreAccount: () => Promise<void>;
  recreateAccount: () => Promise<void>;
  checkUser: () => Promise<CheckUserResponse>;
  telegramAutoAuth: () => Promise<'restore' | 'ok'>;
  devLogin: (telegramId: string) => Promise<void>;
  logout: () => void;
  applyWorkspace: (workspaces: Workspace[], preferredRestaurantId?: string | null) => void;
  loadContext: () => Promise<void>;
  refreshContext: () => Promise<void>;
  switchWorkspace: (restaurantId: string) => Promise<void>;
  completeProfile: (payload: CompleteProfilePayload) => Promise<void>;
  createRestaurant: (payload: CreateRestaurantPayload) => Promise<void>;
  joinWithInvite: (token: string) => Promise<void>;
  refreshInvite: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      tokenExpiresAt: null,
      employee: null,
      restaurant: null,
      workspaces: [],
      activeRestaurantId: null,
      workspaceRole: null,
      activeInvitation: null,
      contextLoaded: false,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setSession: (res) => set(sessionFromAuth(res)),

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        const res = await withAuthTimeout(authApi.refresh(refreshToken));
        set(sessionFromAuth(res));
        return res.accessToken;
      },

      login: async () => {
        set({ isLoading: true, error: null });
        try {
          const tg = window.Telegram?.WebApp;
          const initData = tg?.initData;
          if (!initData) {
            throw new Error('Відкрийте застосунок у Telegram');
          }
          tg.ready();
          tg.expand();
          const res = await withAuthTimeout(withRetry(() => authApi.login(initData)));
          set(sessionFromAuth(res));
          await get().loadContext().catch(() => undefined);
        } catch (e) {
          set({
            error: getErrorMessage(e),
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            tokenExpiresAt: null,
            user: null,
          });
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async () => {
        set({ isLoading: true, error: null });
        try {
          const initData = window.Telegram?.WebApp?.initData;
          if (!initData) {
            throw new Error('Відкрийте застосунок у Telegram');
          }
          const res = await withAuthTimeout(authApi.register(initData));
          set(sessionFromAuth(res));
          await get().loadContext().catch(() => undefined);
        } catch (e) {
          set({
            error: getErrorMessage(e),
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            tokenExpiresAt: null,
            user: null,
          });
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      restoreAccount: async () => {
        set({ isLoading: true, error: null });
        try {
          const initData = window.Telegram?.WebApp?.initData;
          if (!initData) {
            throw new Error('Відкрийте застосунок у Telegram');
          }
          const res = await withAuthTimeout(authApi.restoreAccount(initData));
          set(sessionFromAuth(res));
          await get().loadContext().catch(() => undefined);
        } catch (e) {
          set({
            error: getErrorMessage(e),
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            tokenExpiresAt: null,
            user: null,
          });
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      recreateAccount: async () => {
        set({ isLoading: true, error: null });
        try {
          const initData = window.Telegram?.WebApp?.initData;
          if (!initData) {
            throw new Error('Відкрийте застосунок у Telegram');
          }
          const res = await withAuthTimeout(authApi.recreateAccount(initData));
          set(sessionFromAuth(res));
          await get().loadContext().catch(() => undefined);
        } catch (e) {
          set({
            error: getErrorMessage(e),
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            tokenExpiresAt: null,
            user: null,
          });
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      checkUser: async () => {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          throw new Error('Відкрийте застосунок у Telegram');
        }
        return withAuthTimeout(authApi.checkUser(initData));
      },

      telegramAutoAuth: async () => {
        set({ isLoading: true, error: null });
        try {
          const initData = window.Telegram?.WebApp?.initData;
          if (!initData) {
            throw new Error('Відкрийте застосунок у Telegram');
          }

          const tg = window.Telegram?.WebApp;
          tg?.ready();
          tg?.expand();

          const result = await withAuthTimeout(
            (async (): Promise<'restore' | 'ok'> => {
              const status = await authApi.checkUser(initData);
              if (status.deleted && status.can_restore) {
                return 'restore';
              }

              beginFreshTelegramAuth();

              if (status.exists) {
                const res = await withRetry(() => authApi.login(initData));
                set(sessionFromAuth(res));
              } else {
                const { useOnboardingStore } = await import('@/store/onboarding');
                useOnboardingStore.getState().reset();
                const res = await authApi.register(initData);
                set(sessionFromAuth(res));
              }

              await get().loadContext().catch(() => undefined);
              return 'ok';
            })(),
          );

          return result;
        } catch (e) {
          set({
            error: getErrorMessage(e),
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            tokenExpiresAt: null,
            user: null,
          });
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      devLogin: async (telegramId: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await withAuthTimeout(authApi.devLogin(telegramId, 'Dev User'));
          set(sessionFromAuth(res));
          await get().loadContext().catch(() => undefined);
        } catch (e) {
          set({ error: getErrorMessage(e) });
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          tokenExpiresAt: null,
          employee: null,
          restaurant: null,
          workspaces: [],
          activeRestaurantId: null,
          workspaceRole: null,
          activeInvitation: null,
          contextLoaded: false,
          isAuthenticated: false,
          error: null,
        });
      },

      applyWorkspace: (workspaces: Workspace[], preferredRestaurantId?: string | null) => {
        const { activeRestaurantId } = get();
        const candidateId = preferredRestaurantId ?? activeRestaurantId;
        const validCandidate =
          candidateId && workspaces.some((w) => w.restaurant.id === candidateId)
            ? candidateId
            : null;

        let targetId: string | null = null;
        if (validCandidate) {
          targetId = validCandidate;
        } else if (workspaces.length === 1) {
          targetId = workspaces[0].restaurant.id;
        }

        const active = targetId
          ? workspaces.find((w) => w.restaurant.id === targetId) ?? null
          : null;

        set({
          workspaces,
          activeRestaurantId: targetId,
          restaurant: active?.restaurant ?? null,
          employee: active?.employee ?? null,
          workspaceRole: active?.role ?? null,
          contextLoaded: true,
        });
      },

      loadContext: async () => {
        const { user, contextLoaded } = get();
        if (!user || contextLoaded) return;

        try {
          const workspaces = await employeesApi.workspaces();
          get().applyWorkspace(workspaces);

          const { restaurant } = get();
          if (restaurant && (get().workspaceRole === 'owner' || get().workspaceRole === 'admin')) {
            await restaurantsApi.integrityCheck(restaurant.id).catch(() => undefined);
          }
        } catch {
          set({
            workspaces: [],
            restaurant: null,
            employee: null,
            workspaceRole: null,
            contextLoaded: true,
          });
        }
      },

      refreshContext: async () => {
        const { user } = get();
        if (!user) return;

        const previousId = get().activeRestaurantId;
        set({ contextLoaded: false });

        try {
          const workspaces = await employeesApi.workspaces();
          get().applyWorkspace(workspaces, previousId);

          const { restaurant, workspaceRole } = get();
          if (restaurant && (workspaceRole === 'owner' || workspaceRole === 'admin')) {
            await restaurantsApi.integrityCheck(restaurant.id).catch(() => undefined);
          }
        } catch {
          set({
            workspaces: [],
            restaurant: null,
            employee: null,
            workspaceRole: null,
            contextLoaded: true,
          });
        }
      },

      switchWorkspace: async (restaurantId: string) => {
        const ws = get().workspaces.find((w) => w.restaurant.id === restaurantId);
        if (!ws) return;

        set({
          activeRestaurantId: restaurantId,
          restaurant: ws.restaurant,
          employee: ws.employee,
          workspaceRole: ws.role,
          activeInvitation: null,
        });

        useShiftsStore.setState({ shifts: [] });

        if (ws.role === 'owner' || ws.role === 'admin') {
          await get().refreshInvite().catch(() => undefined);
          await restaurantsApi.integrityCheck(restaurantId).catch(() => undefined);
        }
      },

      completeProfile: async (payload) => {
        const res = await withAuthTimeout(authApi.completeProfile(payload));
        set(sessionFromAuth(res));
        await get().loadContext().catch(() => undefined);
      },

      createRestaurant: async (payload) => {
        const { restaurant, invitation } = await restaurantsApi.create(payload);
        await get().refreshContext();
        await get().switchWorkspace(restaurant.id);
        set({ activeInvitation: invitation });
      },

      joinWithInvite: async (token) => {
        const { restaurant } = await inviteApi.join(token);
        await get().refreshContext();
        await get().switchWorkspace(restaurant.id);
      },

      refreshInvite: async () => {
        const { restaurant } = get();
        if (!restaurant) return;
        const invitation = await restaurantsApi.regenerateInvite(restaurant.id);
        set({ activeInvitation: invitation });
      },
    }),
    {
      name: 'crewio-auth',
      partialize: (s) => ({
        token: s.token,
        refreshToken: s.refreshToken,
        tokenExpiresAt: s.tokenExpiresAt,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        activeRestaurantId: s.activeRestaurantId,
        workspaceCache:
          s.restaurant && s.workspaces.length > 0
            ? {
                workspaces: s.workspaces,
                restaurant: s.restaurant,
                employee: s.employee,
                workspaceRole: s.workspaceRole,
              }
            : null,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthState> & {
          workspaceCache?: WorkspaceCache | null;
        };
        const { workspaceCache, ...authFields } = persisted;
        const merged = {
          ...currentState,
          ...authFields,
          contextLoaded: false,
        } as AuthState;

        if (
          workspaceCache &&
          authFields.activeRestaurantId &&
          workspaceCache.restaurant.id === authFields.activeRestaurantId
        ) {
          merged.workspaces = workspaceCache.workspaces;
          merged.restaurant = workspaceCache.restaurant;
          merged.employee = workspaceCache.employee;
          merged.workspaceRole = workspaceCache.workspaceRole;
        }

        return merged;
      },
    },
  ),
);

interface ShiftsState {
  shifts: Shift[];
  isLoading: boolean;
  fetchShifts: (restaurantId?: string, employeeId?: string) => Promise<void>;
  upsertShift: (shift: Shift) => void;
  removeShift: (id: string) => void;
}

export const useShiftsStore = create<ShiftsState>((set, get) => ({
  shifts: [],
  isLoading: false,

  fetchShifts: async (restaurantId, employeeId) => {
    set({ isLoading: true });
    try {
      const shifts = await shiftsApi.list({ restaurantId, employeeId });
      set({ shifts });
    } finally {
      set({ isLoading: false });
    }
  },

  upsertShift: (shift) => {
    const { shifts } = get();
    const idx = shifts.findIndex((s) => s.id === shift.id);
    if (idx >= 0) {
      const next = [...shifts];
      next[idx] = shift;
      set({ shifts: next });
    } else {
      set({ shifts: [shift, ...shifts] });
    }
  },

  removeShift: (id) => {
    set({ shifts: get().shifts.filter((s) => s.id !== id) });
  },
}));

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: (userId: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  prepend: (n: Notification) => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async (userId) => {
    const notifications = await notificationsApi.list(userId);
    set({
      notifications,
      unreadCount: notifications.filter((n) => n.status === 'unread').length,
    });
  },

  markRead: async (id) => {
    const updated = await notificationsApi.markRead(id);
    const notifications = get().notifications.map((n) =>
      n.id === id ? updated : n,
    );
    set({
      notifications,
      unreadCount: notifications.filter((n) => n.status === 'unread').length,
    });
  },

  prepend: (n) => {
    const notifications = [n, ...get().notifications];
    set({
      notifications,
      unreadCount: notifications.filter((x) => x.status === 'unread').length,
    });
  },
}));

interface ToastState {
  toasts: ToastMessage[];
  push: (toast: Omit<ToastMessage, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (toast) => {
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { ...toast, id }] });
    setTimeout(() => get().dismiss(id), 4000);
  },

  dismiss: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

interface AppState {
  isOnline: boolean;
  apiUnreachable: boolean;
  setOnline: (v: boolean) => void;
  setApiUnreachable: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: true,
  apiUnreachable: false,
  setOnline: (v) =>
    set({ isOnline: v, apiUnreachable: v ? false : true }),
  setApiUnreachable: (v) => set({ apiUnreachable: v }),
}));
