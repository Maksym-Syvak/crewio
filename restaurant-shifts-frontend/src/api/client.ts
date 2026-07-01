import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

let getToken: (() => string | null) | null = null;
let onUnauthorized: (() => void) | null = null;
let onNetworkError: (() => void) | null = null;
let onNetworkOk: (() => void) | null = null;

export function setupApiInterceptors(
  tokenGetter: () => string | null,
  unauthorizedHandler: () => void,
  networkHandlers?: { onFail?: () => void; onOk?: () => void },
) {
  getToken = tokenGetter;
  onUnauthorized = unauthorizedHandler;
  onNetworkError = networkHandlers?.onFail ?? null;
  onNetworkOk = networkHandlers?.onOk ?? null;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
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
    if (error.response?.status === 401) {
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
