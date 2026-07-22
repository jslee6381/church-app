"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, MapPin } from "lucide-react";
import type { EventListItem } from "@/lib/events";

type Props = {
  events: EventListItem[];
};

function formatEventDateTime(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function HomeUpcomingEventsCarousel({ events }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (events.length === 0) {
    return null;
  }

  const currentEvent = events[currentIndex];
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < events.length - 1;

  return (
    <article className="overflow-hidden bg-background">
      <div className="px-4 pb-1">
        <p className="ui-text m-0 text-center font-sans font-semibold text-foreground">Upcoming Event</p>
      </div>
      <div className="bg-background px-4 pt-4 pb-4">
        <div className="mb-4 grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3">
          <div className="flex justify-start">
            <button
              aria-label="Previous event"
              className="inline-flex size-10 items-center justify-center rounded-full border border-border/80 bg-white/70 text-foreground disabled:opacity-35"
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
                href={`/events#event-${currentEvent.id}`}
              >
                <span className="truncate">{currentEvent.title}</span>
                <ExternalLink className="size-3.5 shrink-0" />
              </Link>
              {currentEvent.isLiveStream && currentEvent.liveStreamUrl ? (
                <Link
                  aria-label={`Open live stream for ${currentEvent.title}`}
                  className="inline-flex h-7 shrink-0 items-center justify-center rounded-[10px] bg-[#f24b00] px-2.5 text-[0.72rem] font-bold uppercase tracking-[0.06em] text-white no-underline"
                  href={currentEvent.liveStreamUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Live
                </Link>
              ) : null}
            </div>
            <div className="mt-2 space-y-2">
              <p className="ui-text m-0 flex items-center justify-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4 shrink-0 text-primary" />
                <span>{formatEventDateTime(currentEvent.startsAt)}</span>
              </p>
              {currentEvent.locationName ? (
                <p className="ui-text m-0 flex items-center justify-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <span>{currentEvent.locationName}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              aria-label="Next event"
              className="inline-flex size-10 items-center justify-center rounded-full border border-border/80 bg-white/70 text-foreground disabled:opacity-35"
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
