"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, House } from "lucide-react";
import { useBottomNavVisibility } from "@/components/navigation/bottom-nav-visibility";

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
    href: "/study",
    label: "Study",
    icon: FileText,
  },
  {
    href: "/home",
    label: "Home",
    icon: House,
  },
  {
    href: "/video",
    label: "Video",
    icon: VideoBoardIcon,
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const visibility = useBottomNavVisibility();
  const shouldShow = pathname === "/home" || pathname === "/study" || pathname === "/video";

  if (!shouldShow || visibility?.visible === false) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 px-3">
      <div className="mx-auto w-full max-w-[350px]">
        <nav
          aria-label="Bottom navigation"
          className="bottom-nav-surface pointer-events-auto grid grid-cols-3 rounded-[23px] border border-border p-1.25 shadow-none"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                aria-label={item.label}
                className={`bottom-nav-item flex min-h-11 items-center justify-center rounded-[19px] transition ${
                  isActive ? "bottom-nav-item-active text-primary" : "bottom-nav-item-inactive text-accent-foreground"
                }`}
                href={item.href}
                key={item.href}
              >
                <Icon
                  className={`${
                    item.label === "Video" ? "size-[1.7rem]" : "size-6"
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
