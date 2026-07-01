const LOGGED_OUT_KEY = 'crewio-logged-out';

export function markLoggedOut() {
  sessionStorage.setItem(LOGGED_OUT_KEY, '1');
}

export function isLoggedOut() {
  return sessionStorage.getItem(LOGGED_OUT_KEY) === '1';
}

export function clearLoggedOut() {
  sessionStorage.removeItem(LOGGED_OUT_KEY);
}
