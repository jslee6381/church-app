"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, Heart } from "lucide-react";
import { HomeAnnouncementsCarousel } from "@/components/announcements/home-announcements-carousel";
import { HomeUpcomingEventsCarousel } from "@/components/events/home-upcoming-events-carousel";
import { useBottomNavVisibility } from "@/components/navigation/bottom-nav-visibility";

const quickActions: {
  href: string;
  title: string;
  icon: typeof BookOpen;
  external?: boolean;
}[] = [
  { href: "/events", title: "Events", icon: CalendarDays },
  { href: "/prayer", title: "Prayer", icon: Heart },
  { href: "/daily-bread", title: "Daily Bread", icon: BookOpen },
];

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

    const data = (await response.json()) as { authenticated?: boolean; member?: { status?: string | null } };
    if (data.authenticated !== true) return "signed_out";
    return data.member?.status === "active" ? "active" : "pending";
  } catch {
    return "signed_out";
  }
}

type Props = {
  headerAction?: ReactNode;
  wordmark: {
    light: { src: string; width: number; height: number };
    dark: { src: string; width: number; height: number };
  };
};

export function HomeTabbedSections({ headerAction, wordmark }: Props) {
  const bottomNavVisibility = useBottomNavVisibility();
  const router = useRouter();
  const [fellowshipAccessState, setFellowshipAccessState] = useState<FellowshipAccessState>("unknown");

  useEffect(() => {
    bottomNavVisibility?.setVisible(true);
  }, [bottomNavVisibility]);

  function openRoute(href: string) {
    router.push(href);
  }

  async function openFellowshipRoute() {
    let nextState = fellowshipAccessState;
    if (nextState === "unknown") {
      nextState = await fetchFellowshipAccessState();
      setFellowshipAccessState(nextState);
    }

    if (nextState === "active") {
      router.push("/fellowship");
      return;
    }

    if (nextState === "pending") {
      router.push("/access-required?mode=pending&context=community-feed&next=%2Ffellowship");
      return;
    }

    router.push("/access-required?context=community-feed&next=%2Ffellowship");
  }

  return (
    <div className="mt-2 space-y-8">
      <div className="-mx-4 mb-1">
        <div className="px-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center bg-transparent shadow-none">
              <Link className="top-route-tab top-route-tab-active ui-text inline-flex min-h-11 items-center px-4 transition" href="/home">
                Home
              </Link>
              <button
                className="top-route-tab top-route-tab-inactive ui-text inline-flex min-h-11 items-center px-4 transition"
                onClick={() => void openFellowshipRoute()}
                type="button"
              >
                Moments
              </button>
            </div>
            {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
          </div>
        </div>
      </div>

      <section className="-mt-px overflow-hidden">
        <div className="flex justify-center">
          <img alt="KOINONIA" className="light-wordmark block h-auto w-[calc(100%+4px)] max-w-[424px] translate-y-[-1px] scale-[1.01] align-top" draggable="false" height={wordmark.light.height} src={wordmark.light.src} width={wordmark.light.width} />
          <img alt="KOINONIA" className="dark-wordmark block h-auto w-[calc(100%+4px)] max-w-[424px] translate-y-[-1px] align-top" draggable="false" height={wordmark.dark.height} src={wordmark.dark.src} width={wordmark.dark.width} />
        </div>
      </section>

      <section className="fade-up -mt-4 -mx-4">
        <div className="px-3">
          <div className="grid grid-cols-3 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isLaunchAction = action.href === '/events' || action.href === '/prayer';
              return action.external ? (
                <Link
                  key={action.href}
                  className="home-surface rounded-[16px] border border-border bg-card px-4 py-3 transition hover:bg-card"
                  href={action.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div className="flex min-h-[88px] flex-col items-center justify-center gap-2 text-center">
                    <div className="quick-action-icon inline-flex size-[40px] shrink-0 items-center justify-center text-accent-foreground">
                      <Icon className="size-[33px]" />
                    </div>
                    <p className="ui-text m-0 whitespace-nowrap text-[0.95rem] font-semibold leading-tight text-foreground">{action.title}</p>
                  </div>
                </Link>
              ) : (
                <button
                  key={action.href}
                  className="home-surface rounded-[16px] border border-border bg-card px-4 py-3 text-left transition hover:bg-card"
                  onClick={() => router.push(action.href)}
                  type="button"
                >
                  <div className="flex min-h-[88px] flex-col items-center justify-center gap-2 text-center">
                    <div className="quick-action-icon inline-flex size-[40px] shrink-0 items-center justify-center text-accent-foreground">
                      <Icon className="size-[33px]" />
                    </div>
                    <p className="ui-text m-0 whitespace-nowrap text-[0.95rem] font-semibold leading-tight text-foreground">{action.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="fade-up -mx-4 -mt-3">
        <div className="px-7 pb-2">
          <p className="ui-text m-0 text-left text-foreground">Upcoming Event</p>
        </div>
        <div className="px-3">
          <HomeUpcomingEventsCarousel />
        </div>
      </section>

      <section className="fade-up -mx-4 -mt-4">
        <div className="px-7 pb-3">
          <p className="ui-text m-0 text-left text-foreground">Announcement</p>
        </div>
        <div className="px-3">
          <HomeAnnouncementsCarousel />
        </div>
      </section>
    </div>
  );
}
