"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  readStoredTheme,
  THEME_STORAGE_KEY,
  type AppTheme,
} from "@/lib/themes";

interface ThemeContextValue {
  theme: AppTheme;
  currentTheme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDocument(theme: AppTheme) {
  const root = document.documentElement;
  const body = document.body;

  root.setAttribute("data-theme", theme);
  root.classList.remove("theme-gothic", "theme-default");
  body.classList.remove("theme-gothic", "theme-default");

  if (theme === "gothic") {
    root.classList.add("theme-gothic");
    body.classList.add("theme-gothic");
  } else {
    root.classList.add("theme-default");
    body.classList.add("theme-default");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("parchment");

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    applyThemeToDocument(stored);
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "gothic" ? "parchment" : "gothic"));
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, currentTheme: theme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
