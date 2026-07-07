import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, EB_Garamond } from "next/font/google";

import { AuthProvider } from "@/components/auth/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const gothicDisplay = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  variable: "--font-gothic-display",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-gothic-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "QuestLog — Квестовый дневник",
  description: "RPG-задачник с квестами, наградами и прокачкой героя",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem('questlog-theme') || 'parchment';
    if (theme === 'rpg' || theme === 'medieval') theme = 'parchment';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.remove('theme-gothic', 'theme-default');
    document.body.classList.remove('theme-gothic', 'theme-default');
    if (theme === 'gothic') {
      document.documentElement.classList.add('theme-gothic');
      document.body.classList.add('theme-gothic');
    } else {
      document.documentElement.classList.add('theme-default');
      document.body.classList.add('theme-default');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${gothicDisplay.variable} ${ebGaramond.variable} theme-default`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="theme-default">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
