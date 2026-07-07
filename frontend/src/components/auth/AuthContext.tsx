"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  getMe,
  login as apiLogin,
  register as apiRegister,
  setUnauthorizedHandler,
} from "@/lib/api";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "@/lib/auth-storage";
import type { Adventurer } from "@/lib/types";

interface AuthContextValue {
  adventurer: Adventurer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  logout: () => void;
  refreshAdventurer: () => Promise<Adventurer | null>;
  setAdventurer: (adventurer: Adventurer) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [adventurer, setAdventurer] = useState<Adventurer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearStoredToken();
    setAdventurer(null);
    router.replace("/login");
  }, [router]);

  const refreshAdventurer = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setAdventurer(null);
      return null;
    }

    try {
      const profile = await getMe();
      setAdventurer(profile);
      return profile;
    } catch {
      clearStoredToken();
      setAdventurer(null);
      return null;
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = getStoredToken();
      if (!token) {
        if (!cancelled) {
          setAdventurer(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const profile = await getMe();
        if (!cancelled) {
          setAdventurer(profile);
        }
      } catch {
        clearStoredToken();
        if (!cancelled) {
          setAdventurer(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe = true) => {
      const { access_token } = await apiLogin(email, password);
      setStoredToken(access_token, rememberMe);
      const profile = await getMe();
      setAdventurer(profile);
      router.replace("/");
    },
    [router],
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const response = await apiRegister(email, password, displayName);
      setStoredToken(response.access_token, true);
      setAdventurer(response.adventurer);
      router.replace("/");
    },
    [router],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      adventurer,
      isAuthenticated: adventurer != null,
      isLoading,
      login,
      register,
      logout,
      refreshAdventurer,
      setAdventurer,
    }),
    [
      adventurer,
      isLoading,
      login,
      register,
      logout,
      refreshAdventurer,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
