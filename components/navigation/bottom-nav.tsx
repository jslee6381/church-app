"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileText, House, Settings, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBottomNavVisibility } from "@/components/navigation/bottom-nav-visibility";

function FellowshipIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        backgroundColor: "currentColor",
        maskImage: "url('/fellowship-icon.png')",
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskImage: "url('/fellowship-icon.png')",
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

function GalleryIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        backgroundColor: "currentColor",
        maskImage: "url('/gallery-icon.png')",
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskImage: "url('/gallery-icon.png')",
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

type NavKey = "home" | "fellowship" | "gallery" | "video" | "settings" | "admin";
type FellowshipAccessState = "unknown" | "signed_out" | "pending" | "active";

function getCurrentNavKey(pathname: string): NavKey {
  if (pathname === "/home") return "home";
  if (pathname === "/fellowship") return "fellowship";
  if (pathname === "/gallery") return "gallery";
  if (pathname === "/material") return "video";
  if (pathname === "/admin") return "admin";
  return "settings";
}

const items = [
  { href: "/home", label: "Home", icon: House, navKey: "home" as const },
  { href: "/fellowship", label: "Fellowship", icon: FellowshipIcon, navKey: "fellowship" as const },
  { href: "/gallery", label: "Gallery", icon: GalleryIcon, navKey: "gallery" as const },
  { href: "/material", label: "Material", icon: FileText, navKey: "video" as const },
  { href: "/settings", label: "Setting", icon: Settings, navKey: "settings" as const },
] as const;

async function fetchBottomNavState(): Promise<{
  fellowshipAccessState: FellowshipAccessState;
  canAccessAdmin: boolean;
}> {
  try {
    const response = await fetch("/api/member/profile", {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        fellowshipAccessState: "signed_out",
        canAccessAdmin: false,
      };
    }

    const data = (await response.json()) as {
      authenticated?: boolean;
      canAccessAdmin?: boolean;
      member?: { status?: string | null };
    };

    if (data.authenticated !== true) {
      return {
        fellowshipAccessState: "signed_out",
        canAccessAdmin: false,
      };
    }

    return {
      fellowshipAccessState: data.member?.status === "active" ? "active" : "pending",
      canAccessAdmin: data.canAccessAdmin === true,
    };
  } catch {
    return {
      fellowshipAccessState: "signed_out",
      canAccessAdmin: false,
    };
  }
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const visibility = useBottomNavVisibility();
  const [isAndroid, setIsAndroid] = useState(false);
  const [fellowshipAccessState, setFellowshipAccessState] = useState<FellowshipAccessState>("unknown");
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [optimisticNavKey, setOptimisticNavKey] = useState<NavKey | null>(null);
  const currentNavKey = useMemo(() => getCurrentNavKey(pathname), [pathname]);
  const shouldShow = pathname === "/home" || pathname === "/fellowship" || pathname === "/gallery" || pathname === "/material" || pathname === "/settings" || pathname === "/admin";
  const navItems = useMemo(
    () =>
      canAccessAdmin
        ? [...items, { href: "/admin", label: "Admin", icon: Shield, navKey: "admin" as const }]
        : items,
    [canAccessAdmin],
  );

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsAndroid(/Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    setOptimisticNavKey((current) => (current === currentNavKey ? null : current));
  }, [currentNavKey]);

  useEffect(() => {
    router.prefetch("/home");
    router.prefetch("/fellowship");
    router.prefetch("/gallery");
    router.prefetch("/material");
    router.prefetch("/settings");
    router.prefetch("/admin");
  }, [router]);

  useEffect(() => {
    const supabase = createClient();

    const syncAccessState = async () => {
      const nextState = await fetchBottomNavState();
      setFellowshipAccessState(nextState.fellowshipAccessState);
      setCanAccessAdmin(nextState.canAccessAdmin);
    };

    void syncAccessState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setFellowshipAccessState("signed_out");
        setCanAccessAdmin(false);
        return;
      }

      if (event === "SIGNED_IN") {
        void syncAccessState();
      }
    });

    window.addEventListener("focus", syncAccessState);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", syncAccessState);
    };
  }, []);

  function handleStandardNavClick(event: MouseEvent<HTMLButtonElement>, href: string, navKey: NavKey) {
    event.preventDefault();
    if (currentNavKey === navKey) return;
    setOptimisticNavKey(navKey);
    router.push(href);
  }

  async function handleFellowshipClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (currentNavKey === "fellowship") return;

    let nextState = fellowshipAccessState;
    if (nextState === "unknown") {
      const bottomNavState = await fetchBottomNavState();
      nextState = bottomNavState.fellowshipAccessState;
      setFellowshipAccessState(nextState);
      setCanAccessAdmin(bottomNavState.canAccessAdmin);
    }

    setOptimisticNavKey("fellowship");

    if (nextState === "active") {
      router.push("/fellowship");
      return;
    }

    if (nextState === "pending") {
      setOptimisticNavKey(null);
      router.push("/access-required?mode=pending&context=community-feed&next=%2Ffellowship");
      return;
    }

    setOptimisticNavKey(null);
    router.push("/access-required?context=community-feed&next=%2Ffellowship");
  }

  if (!shouldShow || visibility?.visible === false) {
    return null;
  }

  return (
    <div className={`pointer-events-none fixed inset-x-0 z-40 ${isAndroid ? "bottom-0 px-0" : "bottom-[calc(env(safe-area-inset-bottom)+28px)] px-3"}`}>
      <div className={`mx-auto w-full ${isAndroid ? "max-w-none" : "max-w-[460px]"}`}>
        <nav
          aria-label="Bottom navigation"
          className={`bottom-nav-surface pointer-events-auto grid ${canAccessAdmin ? "grid-cols-6" : "grid-cols-5"} border border-border shadow-none ${isAndroid ? "bottom-nav-surface-android rounded-none border-x-0 border-b-0 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]" : "rounded-[23px] p-1.25"}`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = (optimisticNavKey ?? currentNavKey) === item.navKey;

            return (
              <button
                key={item.href}
                aria-label={item.label}
                className={`bottom-nav-item flex min-h-11 items-center justify-center transition ${isActive ? "bottom-nav-item-active" : "bottom-nav-item-inactive"} ${isAndroid ? "rounded-[12px] py-0.5" : "rounded-[19px] py-0.5"}`}
                onClick={(event) => item.navKey === "fellowship" ? handleFellowshipClick(event) : handleStandardNavClick(event, item.href, item.navKey)}
                type="button"
              >
                <Icon className={`${item.navKey === "video" ? "size-[1.78rem]" : item.navKey === "fellowship" ? "size-[2.5rem]" : item.navKey === "settings" ? "size-[1.72rem]" : item.navKey === "admin" ? "size-[1.58rem]" : "size-[1.78rem]"} ${isActive ? "stroke-[2.2]" : "stroke-[2.05]"}`} />
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
