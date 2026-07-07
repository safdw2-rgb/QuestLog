"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { AuthShell } from "@/components/auth/AuthShell";
import { GuestGuard } from "@/components/auth/AuthGuard";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  return (
    <GuestGuard>
      <ForgotPasswordForm />
    </GuestGuard>
  );
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const response = await forgotPassword(email);
      setMessage(response.message);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось отправить запрос",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Сброс пароля"
      subtitle="Укажите email — ссылка для восстановления появится в логах бэкенда"
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
          disabled={submitting}
        >
          {submitting ? "Отправляем..." : "Получить ссылку"}
        </button>
      </form>

      <div className="auth-footer mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
        <Link href="/login" className="auth-link text-sm">
          ← Вернуться ко входу
        </Link>
        <ThemeSwitcher />
      </div>
    </AuthShell>
  );
}
