export const AUTH_TIMEOUT_MS = 10_000;

export const AUTH_TIMEOUT_MESSAGE =
  'Не вдалося виконати авторизацію.\n\nСпробуйте повторно відкрити застосунок.';

export const CONTEXT_LOAD_TIMEOUT_MS = 10_000;

export const CONTEXT_LOAD_ERROR_MESSAGE = 'Не вдалося підключитися до сервера.';

/** Delays between workspace fetch attempts (0s, +2s, +5s) within CONTEXT_LOAD_TIMEOUT_MS. */
const CONTEXT_RETRY_DELAYS_MS = [0, 2000, 5000];

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loadWithContextRetry<T>(fetchFn: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + CONTEXT_LOAD_TIMEOUT_MS;
  let lastError: unknown;

  for (let attempt = 0; attempt < CONTEXT_RETRY_DELAYS_MS.length; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    if (attempt > 0) {
      await sleep(Math.min(CONTEXT_RETRY_DELAYS_MS[attempt], remaining));
      if (Date.now() >= deadline) break;
    }

    const attemptBudget = deadline - Date.now();
    if (attemptBudget <= 0) break;

    try {
      return await withTimeout(fetchFn(), attemptBudget, CONTEXT_LOAD_ERROR_MESSAGE);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(CONTEXT_LOAD_ERROR_MESSAGE);
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function withAuthTimeout<T>(promise: Promise<T>) {
  return withTimeout(promise, AUTH_TIMEOUT_MS, AUTH_TIMEOUT_MESSAGE);
}
