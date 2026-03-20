"use client";

import { useTheme } from "./ThemeProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type ThemeToggleProps = {
  compact?: boolean;
  invert?: boolean;
};

export function ThemeToggle({ compact, invert }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <button
      type="button"
      aria-label={theme === "light" ? t.header.switchToDark : t.header.switchToLight}
      onClick={toggleTheme}
      className={`flex flex-shrink-0 items-center justify-center rounded-md transition-colors ${
        invert
          ? "text-white/80 hover:bg-white/10 hover:text-white"
          : "text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
      } ${compact ? "h-8 w-8" : "h-10 w-10 rounded-lg"}`}
    >
      {theme === "light" ? (
        <svg
          className={compact ? "h-4 w-4" : "h-5 w-5"}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
          />
        </svg>
      ) : (
        <svg
          className={compact ? "h-4 w-4" : "h-5 w-5"}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1.5m0 16.5V21m-9-9H3m18 0h-1.5M4.5 4.5l-1-1m17 17l-1-1m-17 0l1-1m17 17l1-1M12 16.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
          />
        </svg>
      )}
    </button>
  );
}
