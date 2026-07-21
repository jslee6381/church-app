import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SupabaseAuthSync } from "@/components/auth/supabase-auth-sync";
import { LiveRouteRefresh } from "@/components/navigation/live-route-refresh";
import { PwaRegistrar } from "@/components/pwa-registrar";
import { UiPreferencesSync } from "@/components/settings/ui-preferences-sync";
import ubfIcon from "@/ubf-icon.png";

export const metadata: Metadata = {
  title: "KOINONIA",
  description: "A calm, trusted church community hub for KOINONIA.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: ubfIcon.src,
    apple: ubfIcon.src,
    shortcut: ubfIcon.src,
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
