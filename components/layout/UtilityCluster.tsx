"use client";

import { LanguageMenu } from "@/components/i18n/LanguageMenu";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type UtilityClusterProps = {
  variant?: "default" | "glass";
  /** Kapalıysa yalnızca tema (ör. mobil üst çubuk — dil hamburger menüde) */
  showLanguages?: boolean;
  showTheme?: boolean;
  /** menu: TR + ok → altta liste; inline: dört dil butonu yan yana */
  languageLayout?: "menu" | "inline";
  /** Üst sağda liste sola doğru açılsın */
  languageMenuAlign?: "start" | "end";
};

export function UtilityCluster({
  variant = "default",
  showLanguages = true,
  showTheme = true,
  languageLayout = "inline",
  languageMenuAlign = "end",
}: UtilityClusterProps) {
  const isGlass = variant === "glass";

  const shell =
    isGlass
      ? "flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-1 py-1"
      : "flex items-center gap-1 rounded-lg border border-border/50 bg-background/40 px-1 py-1";

  const divider = showLanguages && showTheme && (
    <span className={isGlass ? "h-4 w-px bg-white/30" : "h-4 w-px bg-border/80"} aria-hidden />
  );

  return (
    <div className={shell}>
      {showLanguages &&
        (languageLayout === "menu" ? (
          <LanguageMenu
            variant={isGlass ? "glass" : "default"}
            align={languageMenuAlign}
          />
        ) : (
          <LanguageSwitcher />
        ))}
      {divider}
      {showTheme && <ThemeToggle compact invert={isGlass} />}
    </div>
  );
}
