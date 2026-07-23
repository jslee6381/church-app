"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FileText, House, Settings } from "lucide-react";
import { useBottomNavVisibility } from "@/components/navigation/bottom-nav-visibility";


function FellowshipIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="8" cy="6.75" r="2.6" fill="currentColor" />
      <circle cx="16.25" cy="7" r="2.45" fill="currentColor" />
      <path
        d="M4.6 19.2l1.05-5.4a2.95 2.95 0 0 1 2.9-2.38h4.45c.96 0 1.86.46 2.42 1.23l.16.22 3.65-.15a1.95 1.95 0 0 1 .35 3.88l-4.95.56a2.7 2.7 0 0 1-2.43-.9l-.62-.69-.3 3.63"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M13.15 19.2H5.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
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
    href: "/home?tab=fellowship",
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

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visibility = useBottomNavVisibility();
  const [isAndroid, setIsAndroid] = useState(false);
  const isFellowshipActive = pathname === "/home" && searchParams.get("tab") === "fellowship";
  const shouldShow = pathname === "/home" || pathname === "/study" || pathname === "/video" || pathname === "/settings";

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    setIsAndroid(/Android/i.test(navigator.userAgent));
  }, []);

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
            const isActive = item.label === "Fellowship" ? isFellowshipActive : item.label === "Home" ? pathname === "/home" && !isFellowshipActive : pathname === item.href;

            return (
              <Link
                aria-label={item.label}
                className={`bottom-nav-item flex min-h-11 items-center justify-center transition ${
                  isActive ? "bottom-nav-item-active text-primary" : "bottom-nav-item-inactive text-accent-foreground"
                } ${isAndroid ? "rounded-[12px]" : "rounded-[19px]"}`}
                href={item.href}
                key={item.href}
              >
                <Icon
                  className={`${
                    item.label === "Video" ? "size-[1.7rem]" : item.label === "Fellowship" ? "size-[1.75rem]" : item.label === "Setting" ? "size-[1.45rem]" : "size-6"
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
