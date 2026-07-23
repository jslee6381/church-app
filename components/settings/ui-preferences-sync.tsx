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
  const background = resolvedTheme === "dark" ? "#121212" : "#f6f4e1";
  const foreground = resolvedTheme === "dark" ? "#FFFFFF" : "#1e2a2a";

  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.style.backgroundColor = background;
  document.documentElement.style.color = foreground;
  document.documentElement.style.colorScheme = resolvedTheme;

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", background);
    themeColorMeta.removeAttribute("media");
  }

  const appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (appleStatusBarMeta) {
    appleStatusBarMeta.setAttribute("content", resolvedTheme === "dark" ? "black-translucent" : "default");
  }

  if (document.body) {
    document.body.style.backgroundColor = background;
    document.body.style.color = foreground;
    document.body.style.colorScheme = resolvedTheme;
  }
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
