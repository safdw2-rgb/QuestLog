"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthContext";
import { AuthCheckbox } from "@/components/auth/AuthCheckbox";
import { AuthShell } from "@/components/auth/AuthShell";
import { GuestGuard } from "@/components/auth/AuthGuard";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

export default function LoginPage() {
  return (
    <GuestGuard>
      <LoginForm />
    </GuestGuard>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password, rememberMe);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось войти в систему",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Вход в дневник"
      subtitle="Введите печать гильдии, чтобы открыть журнал заданий"
    >
      <form className="auth-form mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-ink-muted">
            Email
          </span>
          <input
            className="journal-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-ink-muted">
            Пароль
          </span>
          <input
            className="journal-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <AuthCheckbox
            checked={rememberMe}
            onChange={setRememberMe}
            label="Запомнить меня"
            id="remember-me"
          />
          <Link href="/forgot-password" className="auth-link text-sm">
            Забыл пароль?
          </Link>
        </div>

        {error && (
          <p className="rounded-lg border border-rose-300/50 bg-rose-50/80 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="journal-button-primary w-full"
          disabled={submitting}
        >
          {submitting ? "Входим..." : "Войти"}
        </button>
      </form>

      <div className="auth-footer mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
        <p className="text-sm text-ink-muted">
          Нет аккаунта?{" "}
          <Link href="/register" className="auth-link font-medium text-ink">
            Регистрация
          </Link>
        </p>
        <ThemeSwitcher />
      </div>
    </AuthShell>
  );
}
