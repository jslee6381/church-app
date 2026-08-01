"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileText, House } from "lucide-react";
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

function ArchiveIcon({ className }: { className?: string }) {
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

function MoreIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        backgroundColor: "currentColor",
        maskImage: "url('/more.png')",
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "135%",
        WebkitMaskImage: "url('/more.png')",
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "135%",
      }}
    />
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        backgroundColor: "currentColor",
        maskImage: "url('/chat.png')",
        maskPosition: "center 53%",
        maskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskImage: "url('/chat.png')",
        WebkitMaskPosition: "center 53%",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

type NavKey = "home" | "fellowship" | "chat" | "video" | "more";
type FellowshipAccessState = "unknown" | "signed_out" | "pending" | "active";

function getCurrentNavKey(pathname: string): NavKey {
  if (pathname === "/home") return "home";
  if (pathname === "/fellowship") return "fellowship";
  if (pathname === "/chat") return "chat";
  if (pathname === "/material") return "video";
  if (pathname === "/settings" || pathname === "/admin") return "more";
  return "more";
}

const items = [
  { href: "/home", label: "Home", icon: House, navKey: "home" as const },
  { href: "/fellowship", label: "Fellowship", icon: ArchiveIcon, navKey: "fellowship" as const },
  { href: "/chat", label: "Chat", icon: ChatIcon, navKey: "chat" as const },
  { href: "/material", label: "Study", icon: FileText, navKey: "video" as const },
  { href: "__more__", label: "More", icon: MoreIcon, navKey: "more" as const },
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
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);
  const [fellowshipAccessState, setFellowshipAccessState] = useState<FellowshipAccessState>("unknown");
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [optimisticNavKey, setOptimisticNavKey] = useState<NavKey | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const currentNavKey = useMemo(() => getCurrentNavKey(pathname), [pathname]);
  const shouldShow = pathname === "/home" || pathname === "/fellowship" || pathname === "/chat" || pathname === "/archive" || pathname === "/material" || pathname === "/settings" || pathname === "/admin";

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsAndroid(/Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    setOptimisticNavKey((current) => (current === currentNavKey ? null : current));
    setIsMoreMenuOpen(false);
  }, [currentNavKey]);

  useEffect(() => {
    router.prefetch("/home");
    router.prefetch("/fellowship");
    router.prefetch("/chat");
    router.prefetch("/archive");
    router.prefetch("/material");
    router.prefetch("/settings");
    router.prefetch("/admin");
  }, [router]);

  useEffect(() => {
    if (!isMoreMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent | globalThis.MouseEvent) {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isMoreMenuOpen]);

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
    setIsMoreMenuOpen(false);
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

  function openMoreRoute(href: "/admin" | "/archive" | "/settings") {
    setIsMoreMenuOpen(false);
    router.push(href);
  }

  if (!shouldShow || visibility?.visible === false) {
    return null;
  }

  return (
    <div className={`pointer-events-none fixed inset-x-0 z-40 ${isAndroid ? "bottom-0 px-0" : "bottom-[calc(env(safe-area-inset-bottom)+28px)] px-3"}`}>
      <div className={`mx-auto w-full ${isAndroid ? "max-w-none" : "max-w-[460px]"}`}>
        <div className="relative" ref={moreMenuRef}>
          {isMoreMenuOpen ? (
            <div
              className={`absolute pointer-events-auto bottom-full right-0 mb-3 min-w-[168px] overflow-hidden rounded-[18px] border border-border menu-surface shadow-[0_14px_36px_rgba(68,52,35,0.14)] ${isAndroid ? "mr-3" : ""}`}
            >
              {canAccessAdmin ? (
                <button
                  className="flex min-h-12 w-full items-center px-4 text-left text-sm font-semibold text-foreground"
                  onClick={() => openMoreRoute("/admin")}
                  type="button"
                >
                  Admin
                </button>
              ) : null}
              <button
                className="flex min-h-12 w-full items-center px-4 text-left text-sm font-semibold text-foreground"
                onClick={() => openMoreRoute("/archive")}
                type="button"
              >
                Archive
              </button>
              <button
                className="flex min-h-12 w-full items-center px-4 text-left text-sm font-semibold text-foreground"
                onClick={() => openMoreRoute("/settings")}
                type="button"
              >
                Settings
              </button>
            </div>
          ) : null}

          <nav
            aria-label="Bottom navigation"
            className={`bottom-nav-surface pointer-events-auto grid grid-cols-5 border border-border shadow-none ${isAndroid ? "bottom-nav-surface-android rounded-none border-x-0 border-b-0 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]" : "rounded-[23px] p-1.25"}`}
          >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = (optimisticNavKey ?? currentNavKey) === item.navKey;
            const itemStateClass = item.navKey === "more"
              ? "bottom-nav-item-inactive"
              : isActive
                ? "bottom-nav-item-active"
                : "bottom-nav-item-inactive";

            return (
              <button
                key={item.href}
                aria-label={item.label}
                className={`bottom-nav-item relative flex min-h-[3.45rem] items-start justify-center transition ${itemStateClass} ${isAndroid ? "rounded-[12px] pt-1 pb-0.5" : "rounded-[19px] pt-1 pb-0.5"}`}
                onClick={(event) => {
                  if (item.navKey === "fellowship") {
                    void handleFellowshipClick(event);
                    return;
                  }

                  if (item.navKey === "more") {
                    event.preventDefault();
                    setIsMoreMenuOpen((current) => !current);
                    return;
                  }

                  handleStandardNavClick(event, item.href, item.navKey);
                }}
                type="button"
              >
                <span className="flex h-[1.95rem] w-full items-center justify-center">
                  <Icon className={`${item.navKey === "video" ? "size-[1.72rem]" : item.navKey === "fellowship" ? "size-[1.82rem]" : item.navKey === "chat" ? "h-[1.9rem] w-[2.3rem]" : item.navKey === "more" ? "size-[1.7rem]" : "size-[1.78rem]"} ${isActive ? "stroke-[2.2]" : "stroke-[2.05]"}`} />
                </span>
                <span className="absolute bottom-[0.38rem] left-1/2 -translate-x-1/2 text-[0.7rem] leading-none text-current">
                  {item.navKey === "fellowship" ? "Moments" : item.label}
                </span>
              </button>
            );
          })}
          </nav>
        </div>
      </div>
    </div>
  );
}
