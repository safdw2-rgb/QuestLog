"use client";

import type { ReactNode } from "react";

import { useTheme } from "@/components/theme/ThemeProvider";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  const { theme } = useTheme();
  const isGothic = theme === "gothic";

  const kicker = isGothic ? "Квестовый дневник" : "QuestLog";

  return (
    <main className="auth-page questlog-app mx-auto min-h-screen max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className={`auth-card mx-auto max-w-md ${isGothic ? "auth-card-gothic" : ""}`}>
        <header className="auth-header text-center">
          <p className="auth-kicker text-xs uppercase tracking-[0.35em] text-ink-muted">
            {kicker}
          </p>
          <h1 className="auth-title font-display text-3xl text-ink md:text-4xl">
            {title}
          </h1>
          <p className="auth-subtitle mt-2 text-sm text-ink-muted">{subtitle}</p>
        </header>
        {children}
      </div>
    </main>
  );
}
