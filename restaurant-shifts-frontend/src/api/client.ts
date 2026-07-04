import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

let getToken: (() => string | null) | null = null;
let getTokenExpiresAt: (() => number | null) | null = null;
let onUnauthorized: (() => void) | null = null;
let refreshSession: (() => Promise<string>) | null = null;
let onNetworkError: (() => void) | null = null;
let onNetworkOk: (() => void) | null = null;

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processRefreshQueue(error: unknown, token: string | null = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  refreshQueue = [];
}

function isAuthEndpoint(url?: string) {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/check-user') ||
    url.includes('/auth/dev-login')
  );
}

export function setupApiInterceptors(
  tokenGetter: () => string | null,
  unauthorizedHandler: () => void,
  options?: {
    onFail?: () => void;
    onOk?: () => void;
    tokenExpiresAtGetter?: () => number | null;
    refreshHandler?: () => Promise<string>;
  },
) {
  getToken = tokenGetter;
  onUnauthorized = unauthorizedHandler;
  onNetworkError = options?.onFail ?? null;
  onNetworkOk = options?.onOk ?? null;
  getTokenExpiresAt = options?.tokenExpiresAtGetter ?? null;
  refreshSession = options?.refreshHandler ?? null;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const expiresAt = getTokenExpiresAt?.();
  if (
    refreshSession &&
    expiresAt &&
    Date.now() > expiresAt - 60_000 &&
    !isAuthEndpoint(config.url)
  ) {
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshSession();
        processRefreshQueue(null, newToken);
        isRefreshing = false;
      } else {
        await new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        });
      }
    } catch {
      // refresh failed — request may still 401
    }
  }

  const token = getToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    onNetworkOk?.();
    return res;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url) &&
      refreshSession
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        try {
          const token = await new Promise<string>((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
          });
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (e) {
          onUnauthorized?.();
          return Promise.reject(e);
        }
      }

      isRefreshing = true;
      try {
        const newToken = await refreshSession();
        processRefreshQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(refreshError, null);
        onUnauthorized?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401 && !isAuthEndpoint(originalRequest?.url)) {
      onUnauthorized?.();
    }

    if (!error.response) {
      onNetworkError?.();
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const msg = error.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
    if (error.code === 'ECONNABORTED') {
      return 'Сервер не відповідає. Зачекайте та спробуйте ще раз';
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Не вдалось з\u2019єднатись із сервером. Перевірте API URL';
    }
    if (!error.response) {
      return 'Сервер тимчасово недоступний';
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Невідома помилка';
}

/** Retry once — useful when Render free tier wakes from sleep. */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (axios.isAxiosError(e) && !e.response) {
      await new Promise((r) => setTimeout(r, 2000));
      return fn();
    }
    throw e;
  }
}
