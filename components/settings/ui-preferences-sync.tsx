"use client";

import { useEffect } from "react";

const STORAGE_KEY = "koinonia-ui-text-size";
const DEFAULT_SIZE = "1rem";

export function applyUiTextSize(size: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty("--ui-text-size", size || DEFAULT_SIZE);
}

export function UiPreferencesSync() {
  useEffect(() => {
    const storedSize = window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SIZE;
    applyUiTextSize(storedSize);
  }, []);

  return null;
}

export { DEFAULT_SIZE, STORAGE_KEY };
