"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileText, House, Settings } from "lucide-react";
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

const items = [
  {
    href: "/home",
    label: "Home",
    icon: House,
  },
  {
    href: "/home#fellowship",
    label: "Fellowship",
    icon: FellowshipIcon,
  },
  {
    href: "/study",
    label: "Study",
    icon: FileText,
  },
  {
    href: "/video",
    label: "Video",
    icon: VideoBoardIcon,
  },
  {
    href: "/settings",
    label: "Setting",
    icon: Settings,
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
  const isFellowshipActive = pathname === "/home" && hash === "#fellowship";
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

  async function handleFellowshipClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    let nextState = fellowshipAccessState;

    if (nextState === "unknown") {
      nextState = await fetchFellowshipAccessState();
      setFellowshipAccessState(nextState);
    }

    navigationTransition?.showTemporaryLaunch(180);

    if (nextState === "active") {
      if (typeof window !== "undefined" && pathname === "/home") {
        if (window.location.hash !== "#fellowship") {
          window.location.hash = "fellowship";
        } else {
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }

        return;
      }

      router.push("/home#fellowship");
      return;
    }

    if (nextState === "pending") {
      router.push("/access-required?mode=pending&context=community-feed&next=%2Fhome%23fellowship");
      return;
    }

    router.push("/access-required?context=community-feed&next=%2Fhome%23fellowship");
  }

  if (!shouldShow || visibility?.visible === false) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-40 ${
        isAndroid ? "bottom-0 px-0" : "bottom-4 px-3"
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
            const isActive =
              item.label === "Fellowship"
                ? isFellowshipActive
                : item.label === "Home"
                  ? pathname === "/home" && !isFellowshipActive
                  : pathname === item.href;

            return (
              <Link
                aria-label={item.label}
                className={`bottom-nav-item flex min-h-11 items-center justify-center transition ${
                  isActive ? "bottom-nav-item-active text-primary" : "bottom-nav-item-inactive text-accent-foreground"
                } ${isAndroid ? "rounded-[12px]" : "rounded-[19px]"}`}
                href={item.href}
                key={item.href}
                onClick={item.label === "Fellowship" ? handleFellowshipClick : undefined}
              >
                <Icon
                  className={`${
                    item.label === "Video" ? "size-[1.7rem]" : item.label === "Fellowship" ? "size-[2.25rem]" : item.label === "Setting" ? "size-[1.45rem]" : "size-6"
                  } ${isActive ? "stroke-[2.35]" : "stroke-[2.1]"}`}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
