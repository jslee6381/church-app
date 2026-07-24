"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { BookOpen, CalendarDays, Heart } from "lucide-react";
import { HomeAnnouncementsCarousel } from "@/components/announcements/home-announcements-carousel";
import { HomeUpcomingEventsCarousel } from "@/components/events/home-upcoming-events-carousel";
import { useBottomNavVisibility } from "@/components/navigation/bottom-nav-visibility";
import type { AnnouncementListItem } from "@/lib/announcements";
import type { EventListItem } from "@/lib/events";

const quickActions = [
  { href: "/events", title: "Events", icon: CalendarDays },
  { href: "/prayer", title: "Prayer", icon: Heart },
  { href: "https://ubf.org/daily-breads", title: "Daily Bread", icon: BookOpen, external: true },
];

type Props = {
  announcements: AnnouncementListItem[];
  events: EventListItem[];
  headerAction?: ReactNode;
  wordmark: {
    light: { src: string; width: number; height: number };
    dark: { src: string; width: number; height: number };
  };
};

export function HomeTabbedSections({ announcements, events, headerAction, wordmark }: Props) {
  const bottomNavVisibility = useBottomNavVisibility();

  useEffect(() => {
    bottomNavVisibility?.setVisible(true);
  }, [bottomNavVisibility]);

  return (
    <div className="mt-2 space-y-8">
      <div className="-mx-4 mb-1">
        <div className="px-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center bg-transparent shadow-none">
              <Link className="ui-text inline-flex min-h-11 items-center px-4 text-foreground" href="/home" style={{ fontWeight: 700 }}>
                Home
              </Link>
              <Link className="ui-text inline-flex min-h-11 items-center px-4 text-muted-foreground transition" href="/fellowship" style={{ fontWeight: 700 }}>
                Fellowship
              </Link>
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
              return (
                <Link
                  key={action.href}
                  className="home-surface rounded-[16px] border border-border bg-card px-4 py-3 transition hover:bg-card"
                  href={action.href}
                  rel={action.external ? "noreferrer" : undefined}
                  target={action.external ? "_blank" : undefined}
                >
                  <div className="flex min-h-[88px] flex-col items-center justify-center gap-2 text-center">
                    <div className="quick-action-icon inline-flex size-[40px] shrink-0 items-center justify-center text-accent-foreground">
                      <Icon className="size-[33px]" />
                    </div>
                    <p className="ui-text m-0 whitespace-nowrap text-[0.95rem] font-semibold leading-tight text-foreground">{action.title}</p>
                  </div>
                </Link>
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
          <HomeUpcomingEventsCarousel events={events} />
        </div>
      </section>

      <section className="fade-up -mx-4 -mt-4">
        <div className="px-7 pb-3">
          <p className="ui-text m-0 text-left text-foreground">Announcement</p>
        </div>
        <div className="px-3">
          <HomeAnnouncementsCarousel announcements={announcements} />
        </div>
      </section>
    </div>
  );
}
