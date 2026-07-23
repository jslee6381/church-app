import Script from "next/script";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { SupabaseAuthSync } from "@/components/auth/supabase-auth-sync";
import { LiveRouteRefresh } from "@/components/navigation/live-route-refresh";
import { PwaRegistrar } from "@/components/pwa-registrar";
import { UiPreferencesSync } from "@/components/settings/ui-preferences-sync";

export const metadata: Metadata = {
  title: "New York UBF",
  description: "A calm, trusted church community hub for New York UBF.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
    shortcut: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4e1" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background font-sans text-foreground antialiased" suppressHydrationWarning>
        <Script id="koinonia-theme-init" strategy="beforeInteractive">
          {`try {
  var size = localStorage.getItem("koinonia-ui-text-size") || "1rem";
  document.documentElement.style.setProperty("--ui-text-size", size);
  var mode = localStorage.getItem("koinonia-theme-mode") || "system";
  var resolved = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  var background = resolved === "dark" ? "#121212" : "#f6f4e1";
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
        <PwaRegistrar />
        <SupabaseAuthSync />
        <LiveRouteRefresh />
        <UiPreferencesSync />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
