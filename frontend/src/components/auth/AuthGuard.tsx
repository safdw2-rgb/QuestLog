"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthContext";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <main className="auth-page">
        <div className="auth-loading journal-panel px-8 py-10 text-center">
          <p className="font-display text-xl text-ink">Загружаем дневник...</p>
          <p className="mt-2 text-sm text-ink-muted">Проверяем печать гильдии</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}

export function GuestGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return (
      <main className="auth-page">
        <div className="auth-loading journal-panel px-8 py-10 text-center">
          <p className="font-display text-xl text-ink">Открываем врата...</p>
        </div>
      </main>
    );
  }

  return children;
}
