import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Employee,
  InvitationToken,
  Notification,
  Restaurant,
  Shift,
  ToastMessage,
  User,
} from '@/types';
import { authApi, type CompleteProfilePayload } from '@/api/auth.api';
import { restaurantsApi, inviteApi, type CreateRestaurantPayload } from '@/api/restaurants.api';
import { employeesApi } from '@/api/employees.api';
import { shiftsApi } from '@/api/shifts.api';
import { notificationsApi } from '@/api/notifications.api';
import { getErrorMessage, withRetry } from '@/api/client';
import { clearLoggedOut } from '@/utils/session';

interface AuthState {
  user: User | null;
  token: string | null;
  employee: Employee | null;
  restaurant: Restaurant | null;
  activeInvitation: InvitationToken | null;
  contextLoaded: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  devLogin: (telegramId: string) => Promise<void>;
  logout: () => void;
  loadContext: () => Promise<void>;
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
      employee: null,
      restaurant: null,
      activeInvitation: null,
      contextLoaded: false,
      isAuthenticated: false,
      isLoading: false,
      error: null,

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
          const { accessToken, user } = await withRetry(() =>
            authApi.login(initData),
          );
          set({ token: accessToken, user, isAuthenticated: true });
          clearLoggedOut();
          await get().loadContext().catch(() => undefined);
        } catch (e) {
          set({ error: getErrorMessage(e), isAuthenticated: false, token: null, user: null });
          throw e;
        } finally {
          set({ isLoading: false });
        }
      },

      devLogin: async (telegramId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { accessToken, user } = await authApi.devLogin(
            telegramId,
            'Dev User',
          );
          set({ token: accessToken, user, isAuthenticated: true });
          clearLoggedOut();
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
          employee: null,
          restaurant: null,
          activeInvitation: null,
          contextLoaded: false,
          isAuthenticated: false,
          error: null,
        });
      },

      loadContext: async () => {
        const { user, contextLoaded } = get();
        if (!user || contextLoaded) return;

        try {
          let restaurant = null as Restaurant | null;
          let employee: Employee | null = null;

          if (user.role === 'owner' || user.role === 'admin') {
            const owned = await restaurantsApi.list(user.id);
            restaurant = owned[0] ?? null;
          } else {
            const all = await restaurantsApi.list();
            for (const r of all) {
              try {
                const employees = await employeesApi.list(r.id);
                const match = employees.find((e) => e.user_id === user.id);
                if (match) {
                  restaurant = r;
                  employee = match;
                  break;
                }
              } catch {
                // skip unavailable restaurant
              }
            }
            restaurant ??= all[0] ?? null;
          }

          if (restaurant && !employee) {
            try {
              const employees = await employeesApi.list(restaurant.id);
              employee = employees.find((e) => e.user_id === user.id) ?? null;
            } catch {
              // employee lookup optional for new users
            }
          }

          set({ restaurant, employee, contextLoaded: true });
        } catch {
          set({ restaurant: null, employee: null, contextLoaded: true });
        }
      },

      completeProfile: async (payload) => {
        const { accessToken, user } = await authApi.completeProfile(payload);
        set({ token: accessToken, user, isAuthenticated: true, contextLoaded: false });
        await get().loadContext().catch(() => undefined);
      },

      createRestaurant: async (payload) => {
        const { restaurant, invitation } = await restaurantsApi.create(payload);
        set({
          restaurant,
          activeInvitation: invitation,
          contextLoaded: true,
        });
      },

      joinWithInvite: async (token) => {
        const { employee, restaurant } = await inviteApi.join(token);
        set({
          employee: employee as Employee,
          restaurant,
          contextLoaded: true,
        });
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
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
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
