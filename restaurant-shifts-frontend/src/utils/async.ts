export const AUTH_TIMEOUT_MS = 10_000;

export const AUTH_TIMEOUT_MESSAGE =
  'Не вдалося виконати авторизацію.\n\nСпробуйте повторно відкрити застосунок.';

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
