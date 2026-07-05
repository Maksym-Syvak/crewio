import axios from 'axios';
import { api } from './client';
import type { AuthResponse, UserRole } from '@/types';
import { getTelegramPlatform } from '@/services/telegram';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface CheckUserResponse {
  exists: boolean;
  deleted: boolean;
  can_restore: boolean;
}

export interface CompleteProfilePayload {
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
}

function telegramAuthPayload(initData: string) {
  return {
    initData,
    platform: getTelegramPlatform(),
  };
}

export const authApi = {
  checkUser: (initData: string) =>
    api
      .post<CheckUserResponse>('/auth/check-user', telegramAuthPayload(initData))
      .then((r) => r.data),

  login: (initData: string) =>
    api.post<AuthResponse>('/auth/login', telegramAuthPayload(initData)).then((r) => r.data),

  register: (initData: string) =>
    api.post<AuthResponse>('/auth/register', telegramAuthPayload(initData)).then((r) => r.data),

  restoreAccount: (initData: string) =>
    api
      .post<AuthResponse>('/auth/restore-account', telegramAuthPayload(initData))
      .then((r) => r.data),

  recreateAccount: (initData: string) =>
    api
      .post<AuthResponse>('/auth/recreate-account', telegramAuthPayload(initData))
      .then((r) => r.data),

  devLogin: (telegram_id: string, first_name?: string) =>
    api
      .post<AuthResponse>('/auth/dev-login', { telegram_id: String(telegram_id).trim(), first_name })
      .then((r) => r.data),

  completeProfile: (payload: CompleteProfilePayload) =>
    api.post<AuthResponse>('/auth/complete-profile', payload).then((r) => r.data),

  refresh: (refreshToken: string) =>
    axios
      .post<AuthResponse>(`${API_URL}/auth/refresh`, { refreshToken })
      .then((r) => r.data),

  logout: (refreshToken?: string) =>
    api.post<{ ok: boolean }>('/auth/logout', { refreshToken }).then((r) => r.data),
};
