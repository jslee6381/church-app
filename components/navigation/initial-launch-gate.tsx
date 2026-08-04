"use client";

import { useEffect, useState } from "react";
import { AppLaunchScreen } from "@/components/navigation/app-launch-screen";

const MIN_INITIAL_LAUNCH_MS = 800;
const INITIAL_LAUNCH_COLOR = "#001F3F";
const INITIAL_LAUNCH_FOREGROUND = "#DDDDDD";

function resolveThemeBackground() {
  const theme = document.documentElement.dataset.theme;
  return theme === "dark" ? "#050505" : "rgba(255, 253, 249, 0.82)";
}

function resolveThemeForeground() {
  const theme = document.documentElement.dataset.theme;
  return theme === "dark" ? "#FFFFFF" : "#1e2a2a";
}

export function InitialLaunchGate() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');

    const previousThemeColor = themeColorMeta?.getAttribute("content") ?? null;
    const previousHtmlBackground = html.style.backgroundColor;
    const previousHtmlColor = html.style.color;
    const previousBodyBackground = body?.style.backgroundColor ?? "";
    const previousBodyColor = body?.style.color ?? "";

    html.style.backgroundColor = INITIAL_LAUNCH_COLOR;
    html.style.color = INITIAL_LAUNCH_FOREGROUND;
    if (body) {
      body.style.backgroundColor = INITIAL_LAUNCH_COLOR;
      body.style.color = INITIAL_LAUNCH_FOREGROUND;
    }
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", INITIAL_LAUNCH_COLOR);
      themeColorMeta.removeAttribute("media");
    }

    const timer = window.setTimeout(() => {
      const restoredBackground = resolveThemeBackground();
      const restoredForeground = resolveThemeForeground();

      html.style.backgroundColor = restoredBackground || previousHtmlBackground;
      html.style.color = restoredForeground || previousHtmlColor;
      if (body) {
        body.style.backgroundColor = restoredBackground || previousBodyBackground;
        body.style.color = restoredForeground || previousBodyColor;
      }
      if (themeColorMeta) {
        themeColorMeta.setAttribute("content", restoredBackground);
      }

      setVisible(false);
    }, MIN_INITIAL_LAUNCH_MS);

    return () => {
      window.clearTimeout(timer);
      html.style.backgroundColor = previousHtmlBackground;
      html.style.color = previousHtmlColor;
      if (body) {
        body.style.backgroundColor = previousBodyBackground;
        body.style.color = previousBodyColor;
      }
      if (themeColorMeta && previousThemeColor) {
        themeColorMeta.setAttribute("content", previousThemeColor);
      }
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#001F3F]">
      <AppLaunchScreen variant="initial" />
    </div>
  );
}
