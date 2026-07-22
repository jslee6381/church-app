import { BottomNav } from "@/components/navigation/bottom-nav";
import { BottomNavVisibilityProvider } from "@/components/navigation/bottom-nav-visibility";

export default async function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <BottomNavVisibilityProvider>
      {children}
      <BottomNav />
    </BottomNavVisibilityProvider>
  );
}
