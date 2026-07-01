import { api } from './client';
import type { AuthResponse, UserRole } from '@/types';

export interface CompleteProfilePayload {
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  password?: string;
  password_confirm?: string;
}

export const authApi = {
  login: (initData: string) =>
    api.post<AuthResponse>('/auth/login', { initData }).then((r) => r.data),

  loginPassword: (login: string, password: string) =>
    api
      .post<AuthResponse>('/auth/login-password', { login, password })
      .then((r) => r.data),

  devLogin: (telegram_id: string, first_name?: string) =>
    api
      .post<AuthResponse>('/auth/dev-login', { telegram_id, first_name })
      .then((r) => r.data),

  completeProfile: (payload: CompleteProfilePayload) =>
    api.post<AuthResponse>('/auth/complete-profile', payload).then((r) => r.data),

  logout: () => api.post<{ ok: boolean }>('/auth/logout').then((r) => r.data),

  me: () => api.post('/auth/me').then((r) => r.data),
};
