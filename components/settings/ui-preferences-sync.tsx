"use client";

import { useEffect } from "react";
import { safeLocalStorageGet } from "@/lib/browser-storage";

export const STORAGE_KEY = "koinonia-ui-text-size";
export const DEFAULT_SIZE = "1rem";
export const THEME_STORAGE_KEY = "koinonia-theme-mode";
export const DEFAULT_THEME_MODE = "system";
export type ThemeMode = "light" | "dark" | "system";

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function applyUiTextSize(size: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty("--ui-text-size", size || DEFAULT_SIZE);
}

function getResolvedTheme(mode: ThemeMode) {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  if (typeof window !== "undefined" && window.matchMedia(DARK_MEDIA_QUERY).matches) {
    return "dark";
  }

  return "light";
}

export function applyUiTheme(mode: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  const resolvedTheme = getResolvedTheme(mode);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeMode = mode;
}

export function UiPreferencesSync() {
  useEffect(() => {
    const storedSize = safeLocalStorageGet(STORAGE_KEY) ?? DEFAULT_SIZE;
    const storedTheme = (safeLocalStorageGet(THEME_STORAGE_KEY) as ThemeMode | null) ?? DEFAULT_THEME_MODE;

    applyUiTextSize(storedSize);
    applyUiTheme(storedTheme);

    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
    const handleThemeChange = () => {
      const currentMode = (safeLocalStorageGet(THEME_STORAGE_KEY) as ThemeMode | null) ?? DEFAULT_THEME_MODE;
      if (currentMode === "system") {
        applyUiTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, []);

  return null;
}
