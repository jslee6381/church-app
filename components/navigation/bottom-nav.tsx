"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { House, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBottomNavVisibility } from "@/components/navigation/bottom-nav-visibility";
import { useNavigationTransition } from "@/components/navigation/navigation-transition";


function FellowshipIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        backgroundColor: 'currentColor',
        maskImage: "url('/fellowship-icon.png')",
        maskPosition: 'center',
        maskRepeat: 'no-repeat',
        maskSize: 'contain',
        WebkitMaskImage: "url('/fellowship-icon.png')",
        WebkitMaskPosition: 'center',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
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

function VideoBoardIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <rect
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.9"
        width="18"
        x="3"
        y="5"
      />
      <path
        d="M10 9.2v5.6l4.9-2.8-4.9-2.8Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="0.4"
      />
    </svg>
  );
}

type NavKey = "home" | "fellowship" | "gallery" | "video" | "settings";

function getCurrentNavKey(pathname: string, hash: string): NavKey {
  if (pathname === "/home") {
    return hash === "#fellowship" ? "fellowship" : "home";
  }

  if (pathname === "/study") {
    return "gallery";
  }

  if (pathname === "/video") {
    return "video";
  }

  return "settings";
}

const items = [
  {
    href: "/home",
    label: "Home",
    icon: House,
    navKey: "home" as const,
  },
  {
    href: "/home#fellowship",
    label: "Fellowship",
    icon: FellowshipIcon,
    navKey: "fellowship" as const,
  },
  {
    href: "/study",
    label: "Gallery",
    icon: GalleryIcon,
    navKey: "gallery" as const,
  },
  {
    href: "/video",
    label: "Video",
    icon: VideoBoardIcon,
    navKey: "video" as const,
  },
  {
    href: "/settings",
    label: "Setting",
    icon: Settings,
    navKey: "settings" as const,
  },
] as const;

type FellowshipAccessState = "unknown" | "signed_out" | "pending" | "active";

async function fetchFellowshipAccessState(): Promise<FellowshipAccessState> {
  try {
    const response = await fetch("/api/member/profile", {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return "signed_out";
    }

    const data = (await response.json()) as {
      authenticated?: boolean;
      member?: {
        status?: string | null;
      };
    };

    if (data.authenticated !== true) {
      return "signed_out";
    }

    return data.member?.status === "active" ? "active" : "pending";
  } catch {
    return "signed_out";
  }
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const visibility = useBottomNavVisibility();
  const navigationTransition = useNavigationTransition();
  const [isAndroid, setIsAndroid] = useState(false);
  const [hash, setHash] = useState("");
  const [fellowshipAccessState, setFellowshipAccessState] = useState<FellowshipAccessState>("unknown");
  const [optimisticNavKey, setOptimisticNavKey] = useState<NavKey | null>(null);
  const currentNavKey = useMemo(() => getCurrentNavKey(pathname, hash), [hash, pathname]);
  const isFellowshipActive = currentNavKey === "fellowship";
  const shouldShow = pathname === "/home" || pathname === "/study" || pathname === "/video" || pathname === "/settings";

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    setIsAndroid(/Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncHash = () => {
      setHash(window.location.hash);
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  useEffect(() => {
    setOptimisticNavKey((current) => (current === currentNavKey ? null : current));
  }, [currentNavKey]);

  useEffect(() => {
    router.prefetch("/home");
    router.prefetch("/study");
    router.prefetch("/video");
    router.prefetch("/settings");
  }, [router]);

  useEffect(() => {
    const supabase = createClient();

    const syncAccessState = async () => {
      const nextState = await fetchFellowshipAccessState();
      setFellowshipAccessState(nextState);
    };

    void syncAccessState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setFellowshipAccessState("signed_out");
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

    if (currentNavKey === navKey) {
      return;
    }

    setOptimisticNavKey(navKey);
    navigationTransition?.showTemporaryLaunch(180);

    if (href === "/home") {
      if (typeof window !== "undefined" && pathname === "/home") {
        if (window.location.hash) {
          window.history.pushState(null, "", "/home");
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
        return;
      }

      router.push("/home");
      return;
    }

    router.push(href);
  }

  async function handleFellowshipClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (currentNavKey === "fellowship") {
      return;
    }

    let nextState = fellowshipAccessState;

    if (nextState === "unknown") {
      nextState = await fetchFellowshipAccessState();
      setFellowshipAccessState(nextState);
    }

    setOptimisticNavKey("fellowship");
    navigationTransition?.showTemporaryLaunch(180);

    if (nextState === "active") {
      if (typeof window !== "undefined" && pathname === "/home") {
        const previousHash = window.location.hash;
        const nextUrl = `${window.location.pathname}${window.location.search}#fellowship`;
        window.history.replaceState(null, "", nextUrl);

        if (previousHash !== "#fellowship") {
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }

        return;
      }

      router.push("/home#fellowship");
      return;
    }

    if (nextState === "pending") {
      setOptimisticNavKey(null);
      router.push("/access-required?mode=pending&context=community-feed&next=%2Fhome%23fellowship");
      return;
    }

    setOptimisticNavKey(null);
    router.push("/access-required?context=community-feed&next=%2Fhome%23fellowship");
  }

  if (!shouldShow || visibility?.visible === false) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-40 ${
        isAndroid ? "bottom-0 px-0" : "bottom-[calc(env(safe-area-inset-bottom)+28px)] px-3"
      }`}
    >
      <div className={`mx-auto w-full ${isAndroid ? "max-w-none" : "max-w-[460px]"}`}>
        <nav
          aria-label="Bottom navigation"
          className={`bottom-nav-surface pointer-events-auto grid grid-cols-5 border border-border shadow-none ${
            isAndroid
              ? "bottom-nav-surface-android rounded-none border-x-0 border-b-0 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]"
              : "rounded-[23px] p-1.25"
          }`}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = (optimisticNavKey ?? currentNavKey) === item.navKey;

            return (
              <button
                aria-label={item.label}
                className={`bottom-nav-item flex min-h-11 items-center justify-center transition ${
                  isActive ? "bottom-nav-item-active text-primary" : "bottom-nav-item-inactive text-accent-foreground"
                } ${isAndroid ? "rounded-[12px] py-0.5" : "rounded-[19px] py-0.5"}`}
                key={item.href}
                onClick={(event) =>
                  item.navKey === "fellowship"
                    ? handleFellowshipClick(event)
                    : handleStandardNavClick(event, item.href, item.navKey)
                }
                type="button"
              >
                <Icon
                  className={`${
                    item.navKey === "video" ? "size-[2rem]" : item.navKey === "fellowship" ? "size-[2.5rem]" : item.navKey === "settings" ? "size-[1.72rem]" : "size-[1.78rem]"
                  } ${isActive ? "stroke-[2.2]" : "stroke-[2.05]"}`}
                />
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
