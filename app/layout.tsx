import Script from "next/script";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { SupabaseAuthSync } from "@/components/auth/supabase-auth-sync";
import { LiveRouteRefresh } from "@/components/navigation/live-route-refresh";
import { PwaRegistrar } from "@/components/pwa-registrar";
import { UiPreferencesSync } from "@/components/settings/ui-preferences-sync";

export const metadata: Metadata = {
  title: "KOINONIA",
  description: "A calm, trusted church community hub for KOINONIA.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
    shortcut: "/icon-192.png",
  },
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
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = mode;
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
