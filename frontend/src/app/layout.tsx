import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuestLog — Квестовый дневник",
  description: "RPG-задачник с квестами, наградами и прокачкой героя",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
