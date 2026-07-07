"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthContext";
import { AuthShell } from "@/components/auth/AuthShell";
import { GuestGuard } from "@/components/auth/AuthGuard";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

export default function RegisterPage() {
  return (
    <GuestGuard>
      <RegisterForm />
    </GuestGuard>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await register(
        email,
        password,
        displayName.trim() || undefined,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось создать аккаунт",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Регистрация героя"
      subtitle="Создайте аккаунт и получите свой квестовый дневник"
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
            Имя героя
          </span>
          <input
            className="journal-input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            maxLength={128}
            placeholder="Необязательно"
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
            autoComplete="new-password"
            minLength={8}
            required
          />
          <span className="mt-1 block text-xs text-ink-muted">
            Минимум 8 символов
          </span>
        </label>

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
          {submitting ? "Создаём героя..." : "Зарегистрироваться"}
        </button>
      </form>

      <div className="auth-footer mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
        <p className="text-sm text-ink-muted">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="auth-link font-medium text-ink">
            Войти
          </Link>
        </p>
        <ThemeSwitcher />
      </div>
    </AuthShell>
  );
}
