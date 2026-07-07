"use client";

import { useEffect, useRef, useState } from "react";

import { useTheme } from "@/components/theme/ThemeProvider";
import { APP_THEMES } from "@/lib/themes";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="rpg-quest-icon-slot"
        style={{ cursor: 'pointer', border: 'none', padding: 0 }}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Сменить тему"
      >
        <img
          src="/rpg-ui/System/Icon_setting.png"
          alt="Тема"
          width={22}
          height={22}
          style={{ imageRendering: 'pixelated', display: 'block' }}
        />
      </button>

      {open && (
        <div className="theme-switcher-menu" role="listbox" aria-label="Темы">
          {APP_THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={theme === item.id}
              className={`theme-switcher-option ${
                theme === item.id ? "theme-switcher-option-active" : ""
              }`}
              onClick={() => {
                setTheme(item.id);
                setOpen(false);
              }}
            >
              <span className="font-medium">{item.label}</span>
              <span className="text-xs text-ink-muted">{item.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
