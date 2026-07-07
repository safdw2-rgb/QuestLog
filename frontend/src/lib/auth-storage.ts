export const AUTH_TOKEN_KEY = "questlog-token";

export type TokenStorage = "local" | "session";

function readFromStorage(storage: Storage): string | null {
  try {
    return storage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    readFromStorage(localStorage) ?? readFromStorage(sessionStorage)
  );
}

export function setStoredToken(token: string, rememberMe: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (rememberMe) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
    } else {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore
  }
}
