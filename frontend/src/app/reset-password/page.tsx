"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AuthShell } from "@/components/auth/AuthShell";
import { GuestGuard } from "@/components/auth/AuthGuard";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { resetPassword } from "@/lib/api";

export default function ResetPasswordPage() {
  return (
    <GuestGuard>
      <Suspense
        fallback={
          <AuthShell title="Новый пароль" subtitle="Загружаем форму...">
            <div className="auth-loading mt-8 text-center text-sm text-ink-muted">
              Проверяем печать сброса...
            </div>
          </AuthShell>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </GuestGuard>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Ссылка для сброса пароля недействительна");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setSubmitting(true);

    try {
      const response = await resetPassword(token, password);
      setMessage(response.message);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось обновить пароль",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell
        title="Ссылка недействительна"
        subtitle="Запросите новую ссылку для сброса пароля"
      >
        <div className="mt-8 text-center">
          <Link href="/forgot-password" className="journal-button-primary inline-block">
            Запросить сброс
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Новый пароль"
      subtitle="Введите новый пароль для вашего героя"
    >
      <form className="auth-form mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-ink-muted">
            Новый пароль
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
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-ink-muted">
            Повторите пароль
          </span>
          <input
            className="journal-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        {message && (
          <p className="rounded-lg border border-emerald-300/50 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900">
            {message}
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-rose-300/50 bg-rose-50/80 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="journal-button-primary w-full"
          disabled={submitting || Boolean(message)}
        >
          {submitting ? "Сохраняем..." : "Обновить пароль"}
        </button>
      </form>

      <div className="auth-footer mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
        <Link href="/login" className="auth-link text-sm">
          ← Ко входу
        </Link>
        <ThemeSwitcher />
      </div>
    </AuthShell>
  );
}
