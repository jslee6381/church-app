"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { BookOpen, CalendarDays, Heart } from "lucide-react";
import { CommunityUpdatesSection } from "@/components/community/community-updates-section";
import { HomeUpcomingEventsCarousel } from "@/components/events/home-upcoming-events-carousel";
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
  canManageCommunity: boolean;
  canReact: boolean;
  communityGreeting?: string | null;
  currentMemberName?: string | null;
  currentMemberPhotoUrl?: string | null;
  events: EventListItem[];
  headerAction?: ReactNode;
  wordmark: {
    src: string;
    width: number;
    height: number;
  };
  submitAccessState: "signed_out" | "pending" | "active";
  updates: CommunityUpdateFeedItem[];
};

export function HomeTabbedSections({
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

  function openCommunityTab() {
    if (submitAccessState !== "active") {
      router.push("/access-required?context=community-feed&next=%2Fhome");
      return;
    }

    setActiveTab("community");
  }

  return (
    <div className="mt-2">
      <div className="-mx-4 mb-4">
        <div className="px-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center bg-transparent shadow-none">
              <button
                className={`ui-text min-h-11 px-4 transition ${
                  activeTab === "home"
                    ? "bg-background text-black"
                    : "bg-background text-muted-foreground"
                }`}
                onClick={() => setActiveTab("home")}
                style={{ fontWeight: 700 }}
                type="button"
              >
                Home
              </button>
              <button
                className={`ui-text min-h-11 px-4 transition ${
                  activeTab === "community"
                    ? "bg-background text-black"
                    : "bg-background text-muted-foreground"
                }`}
                onClick={openCommunityTab}
                style={{ fontWeight: 700 }}
                type="button"
              >
                Community
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
                className="block h-auto w-[calc(100%+4px)] max-w-[424px] translate-y-[-1px] scale-[1.01] align-top"
                draggable="false"
                height={wordmark.height}
                src={wordmark.src}
                width={wordmark.width}
              />
            </div>
          </section>

          <section className="fade-up mt-8 -mx-4">
            <div className="px-3">
              <div className="grid grid-cols-3 gap-0 overflow-hidden rounded-[8px] border border-border bg-white/72 shadow-none">
                {quickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Link
                      key={action.href}
                      className="border-r border-border p-4 transition hover:bg-white last:border-r-0"
                      href={action.href}
                      rel={action.external ? "noreferrer" : undefined}
                      target={action.external ? "_blank" : undefined}
                    >
                      <div className="flex min-h-[104px] flex-col items-center justify-center gap-3 text-center">
                        <div className="inline-flex size-[52px] shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <Icon className="size-[27px]" />
                        </div>
                        <p className="ui-text m-0 font-semibold leading-tight text-foreground">{action.title}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="fade-up -mx-4">
            <HomeUpcomingEventsCarousel events={events} />
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
