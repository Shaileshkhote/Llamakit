"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const storageKey = "llamakit-theme";

function getCurrentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(storageKey, theme);
  window.dispatchEvent(new CustomEvent("llamakit-theme-change", { detail: theme }));
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getCurrentTheme());
    setMounted(true);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  const nextLabel = theme === "dark" ? "light" : "dark";

  return (
    <button
      aria-label={`Switch to ${nextLabel} mode`}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-[11px] py-[7px] text-xs leading-none text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
      onClick={toggleTheme}
      type="button"
    >
      <span
        aria-hidden="true"
        className="size-2 rounded-full bg-[var(--text)] shadow-[0_0_0_3px_var(--accent-soft)]"
      />
      {mounted ? (theme === "dark" ? "Light" : "Dark") : "Theme"}
    </button>
  );
}
