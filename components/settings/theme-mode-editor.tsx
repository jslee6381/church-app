"use client";

import { useState } from "react";
import {
  applyUiTheme,
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from "@/components/settings/ui-preferences-sync";
import { safeLocalStorageGet, safeLocalStorageSet } from "@/lib/browser-storage";

const OPTIONS: Array<{ label: string; value: ThemeMode }> = [
  { label: "Light", value: "light" },
  { label: "System", value: "system" },
  { label: "Dark", value: "dark" },
];

export function ThemeModeEditor() {
  const [selectedMode, setSelectedMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_THEME_MODE;
    }

    const stored = safeLocalStorageGet(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : DEFAULT_THEME_MODE;
  });

  function handleSelect(nextMode: ThemeMode) {
    setSelectedMode(nextMode);
    safeLocalStorageSet(THEME_STORAGE_KEY, nextMode);
    applyUiTheme(nextMode);
  }

  return (
    <section className="mb-4 border-t border-border/70 pt-4">
      <div>
        <p className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-primary">Appearance</p>
        <p className="ui-text m-0 mt-1 font-semibold text-foreground">Choose light or dark mode</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => {
          const isActive = selectedMode === option.value;

          return (
            <button
              key={option.value}
              className={`ui-text min-h-11 rounded-[14px] border px-3 transition ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
              onClick={() => handleSelect(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
