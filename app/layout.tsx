import Script from "next/script";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { SupabaseAuthSync } from "@/components/auth/supabase-auth-sync";
import { InitialLaunchGate } from "@/components/navigation/initial-launch-gate";
import { LiveRouteRefresh } from "@/components/navigation/live-route-refresh";
import { NavigationTransitionProvider } from "@/components/navigation/navigation-transition";
import { PwaRegistrar } from "@/components/pwa-registrar";
import { UiPreferencesSync } from "@/components/settings/ui-preferences-sync";

export const metadata: Metadata = {
  title: "New York UBF",
  description: "A calm, trusted church community hub for New York UBF.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "New York UBF",
  },
  icons: {
    icon: "/icon-192-v3.png",
    apple: "/apple-touch-icon-v3.png",
    shortcut: "/icon-192-v3.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: "#001F3F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="bg-background font-sans text-foreground antialiased"
        suppressHydrationWarning
      >
        <Script id="koinonia-theme-init" strategy="beforeInteractive">
          {`try {
  var isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || window.navigator.standalone === true;
  var viewportMeta = document.querySelector('meta[name="viewport"]');
  if (viewportMeta && isStandalone) {
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  }
  if (isStandalone) {
    document.documentElement.style.touchAction = 'manipulation';
    if (document.body) {
      document.body.style.touchAction = 'manipulation';
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        if (document.body) {
          document.body.style.touchAction = 'manipulation';
        }
      }, { once: true });
    }
    document.addEventListener('touchmove', function (event) {
      if (event.touches && event.touches.length > 1) {
        event.preventDefault();
      }
    }, { passive: false });
    document.addEventListener('gesturestart', function (event) {
      event.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturechange', function (event) {
      event.preventDefault();
    }, { passive: false });
    document.addEventListener('gestureend', function (event) {
      event.preventDefault();
    }, { passive: false });
    var lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
      var now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  }
  var size = localStorage.getItem("koinonia-ui-text-size") || "1rem";
  document.documentElement.style.setProperty("--ui-text-size", size);
  var mode = localStorage.getItem("koinonia-theme-mode") || "system";
  var resolved = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  var background = resolved === "dark" ? "#050505" : "rgba(255, 253, 249, 0.82)";
  var foreground = resolved === "dark" ? "#FFFFFF" : "#1e2a2a";
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.style.backgroundColor = background;
  document.documentElement.style.color = foreground;
  document.documentElement.style.colorScheme = resolved;
  var themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', background);
    themeColorMeta.removeAttribute('media');
  }
  var appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (appleStatusBarMeta) {
    appleStatusBarMeta.setAttribute('content', resolved === "dark" ? 'black-translucent' : 'default');
  }
  if (document.body) {
    document.body.style.backgroundColor = background;
    document.body.style.color = foreground;
    document.body.style.colorScheme = resolved;
  }
} catch (e) {}`}
        </Script>
        <NavigationTransitionProvider>
          <InitialLaunchGate />
          <PwaRegistrar />
          <SupabaseAuthSync />
          <LiveRouteRefresh />
          <UiPreferencesSync />
          {children}
        </NavigationTransitionProvider>
        <Analytics />
      </body>
    </html>
  );
}
