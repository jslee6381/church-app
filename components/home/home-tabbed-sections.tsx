"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { HomeAnnouncementsCarousel } from "@/components/announcements/home-announcements-carousel";
import { BookOpen, CalendarDays, Heart } from "lucide-react";
import { CommunityUpdatesSection } from "@/components/community/community-updates-section";
import { HomeUpcomingEventsCarousel } from "@/components/events/home-upcoming-events-carousel";
import { useBottomNavVisibility } from "@/components/navigation/bottom-nav-visibility";
import { useNavigationTransition } from "@/components/navigation/navigation-transition";
import type { AnnouncementListItem } from "@/lib/announcements";
import type { CommunityUpdateFeedItem } from "@/lib/community-updates";
import type { EventListItem } from "@/lib/events";

const quickActions = [
  {
    href: "/events",
    title: "Events",
    icon: CalendarDays,
  },
  {
    href: "/prayer",
    title: "Prayer",
    icon: Heart,
  },
  {
    href: "https://ubf.org/daily-breads",
    title: "Daily Bread",
    icon: BookOpen,
    external: true,
  },
];

type Props = {
  announcements: AnnouncementListItem[];
  canManageCommunity: boolean;
  canReact: boolean;
  communityGreeting?: string | null;
  currentMemberName?: string | null;
  currentMemberPhotoUrl?: string | null;
  events: EventListItem[];
  headerAction?: ReactNode;
  wordmark: {
    light: {
      src: string;
      width: number;
      height: number;
    };
    dark: {
      src: string;
      width: number;
      height: number;
    };
  };
  submitAccessState: "signed_out" | "pending" | "active";
  updates: CommunityUpdateFeedItem[];
};

export function HomeTabbedSections({
  announcements,
  canManageCommunity,
  canReact,
  communityGreeting,
  currentMemberName,
  currentMemberPhotoUrl,
  events,
  headerAction,
  submitAccessState,
  updates,
  wordmark,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"home" | "community">("home");
  const bottomNavVisibility = useBottomNavVisibility();
  const navigationTransition = useNavigationTransition();

  useEffect(() => {
    bottomNavVisibility?.setVisible(true);
  }, [bottomNavVisibility]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncTabFromHash = () => {
      const wantsCommunity = window.location.hash === "#fellowship";

      if (!wantsCommunity) {
        setActiveTab("home");
        return;
      }

      if (submitAccessState === "pending") {
        router.push("/access-required?mode=pending&context=community-feed&next=%2Fhome%23fellowship");
        return;
      }

      if (submitAccessState !== "active") {
        router.push("/access-required?context=community-feed&next=%2Fhome%23fellowship");
        return;
      }

      setActiveTab("community");
    };

    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);

    return () => {
      window.removeEventListener("hashchange", syncTabFromHash);
    };
  }, [router, submitAccessState]);

  function replaceHash(nextHash: string) {
    if (typeof window === "undefined") {
      return;
    }

    const previousHash = window.location.hash;
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    window.history.replaceState(null, "", nextUrl);

    if (previousHash !== nextHash) {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  function goHomeTab() {
    navigationTransition?.showTemporaryLaunch();
    replaceHash("");
  }

  function openCommunityTab() {
    if (submitAccessState === "pending") {
      router.push("/access-required?mode=pending&context=community-feed&next=%2Fhome%23fellowship");
      return;
    }

    if (submitAccessState !== "active") {
      router.push("/access-required?context=community-feed&next=%2Fhome%23fellowship");
      return;
    }

    navigationTransition?.showTemporaryLaunch();
    replaceHash("#fellowship");
  }

  return (
    <div className="mt-2">
      <div className="-mx-4 mb-1">
        <div className="px-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center bg-transparent shadow-none">
              <button
                className={`ui-text min-h-11 px-4 transition ${
                  activeTab === "home"
                    ? "bg-background text-foreground"
                    : "bg-background text-muted-foreground"
                }`}
                onClick={() => {
                  goHomeTab();
                }}
                style={{ fontWeight: 700 }}
                type="button"
              >
                Home
              </button>
              <button
                className={`ui-text min-h-11 px-4 transition ${
                  activeTab === "community"
                    ? "bg-background text-foreground"
                    : "bg-background text-muted-foreground"
                }`}
                onClick={openCommunityTab}
                style={{ fontWeight: 700 }}
                type="button"
              >
                Fellowship
              </button>
            </div>
            {headerAction ? (
              <div className="shrink-0">
                {headerAction}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {activeTab === "home" ? (
        <div className="space-y-8">
          <section className="-mt-px overflow-hidden">
            <div className="flex justify-center">
              <img
                alt="KOINONIA"
                className="light-wordmark block h-auto w-[calc(100%+4px)] max-w-[424px] translate-y-[-1px] scale-[1.01] align-top"
                draggable="false"
                height={wordmark.light.height}
                src={wordmark.light.src}
                width={wordmark.light.width}
              />
              <img
                alt="KOINONIA"
                className="dark-wordmark block h-auto w-[calc(100%+4px)] max-w-[424px] translate-y-[-1px] align-top"
                draggable="false"
                height={wordmark.dark.height}
                src={wordmark.dark.src}
                width={wordmark.dark.width}
              />
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
      ) : (
        <section className="fade-up mt-3 -mx-4">
          {communityGreeting && currentMemberName ? (
            <div className="px-4 pb-3">
              <p className="ui-text m-0 font-semibold text-foreground">
                {communityGreeting}, {currentMemberName}
              </p>
            </div>
          ) : null}
          <CommunityUpdatesSection
            canManage={canManageCommunity}
            canReact={canReact}
            currentMemberPhotoUrl={currentMemberPhotoUrl}
            initialUpdates={updates}
            submitAccessState={submitAccessState}
          />
        </section>
      )}
    </div>
  );
}
