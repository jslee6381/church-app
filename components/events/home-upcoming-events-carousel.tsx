"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { formatEasternEventDateTime } from "@/lib/eastern-time";
import type { EventListItem } from "@/lib/events";

type Props = {
  events: EventListItem[];
};

function LiveIndicatorIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" fill="currentColor" r="2.5" />
      <path
        d="M7.2 7.5a6.5 6.5 0 0 0 0 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M16.8 7.5a6.5 6.5 0 0 1 0 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M4.4 4.8a10.5 10.5 0 0 0 0 14.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M19.6 4.8a10.5 10.5 0 0 1 0 14.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function HomeUpcomingEventsCarousel({ events }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (events.length === 0) {
    return null;
  }

  const currentEvent = events[currentIndex];
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < events.length - 1;
  const titleHref =
    currentEvent.isLiveStream && currentEvent.liveStreamUrl
      ? currentEvent.liveStreamUrl
      : `/events#event-${currentEvent.id}`;
  const titleIsExternal = Boolean(currentEvent.isLiveStream && currentEvent.liveStreamUrl);

  return (
    <article className="home-surface overflow-hidden rounded-[16px] border border-border bg-white/72">
      <div className="pt-4 pb-4">
        <div className="mb-0 grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3">
          <div className="flex justify-start">
            <button
              aria-label="Previous event"
              className="inline-flex size-10 items-center justify-center bg-transparent text-foreground disabled:opacity-35"
              disabled={!canGoPrevious}
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              type="button"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="min-w-0 text-center">
            <div className="flex items-center justify-center gap-2">
              <Link
                className="ui-text inline-flex min-w-0 items-center justify-center gap-1 font-sans font-semibold leading-tight text-foreground underline decoration-border underline-offset-4 transition hover:text-primary"
                href={titleHref}
                rel={titleIsExternal ? "noreferrer" : undefined}
                target={titleIsExternal ? "_blank" : undefined}
              >
                <span className="whitespace-normal break-words text-center">{currentEvent.title}</span>
              </Link>
              {currentEvent.isLiveStream && currentEvent.liveStreamUrl ? (
                <Link
                  aria-label={`Open live stream for ${currentEvent.title}`}
                  className="inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-[9px] bg-[#ff0000] px-2 text-[0.68rem] font-bold uppercase tracking-[0.05em] !text-white no-underline"
                  href={currentEvent.liveStreamUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <LiveIndicatorIcon />
                  Live
                </Link>
              ) : null}
            </div>
            <div className="mt-2 space-y-2 text-left">
              <p className="ui-text m-0 flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4 shrink-0 text-primary" />
                <span>{formatEasternEventDateTime(currentEvent.startsAt)}</span>
              </p>
              {currentEvent.locationName ? (
                <p className="ui-text m-0 flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <span>{currentEvent.locationName}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              aria-label="Next event"
              className="inline-flex size-10 items-center justify-center bg-transparent text-foreground disabled:opacity-35"
              disabled={!canGoNext}
              onClick={() => setCurrentIndex((index) => Math.min(events.length - 1, index + 1))}
              type="button"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
