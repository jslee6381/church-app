"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
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

          <h2
            className="ui-text m-0 text-center font-sans font-semibold leading-tight text-foreground"
          >
            {currentEvent.title}
          </h2>

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

        <p className="ui-text m-0 flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="size-4 shrink-0 text-primary" />
          <span>{formatEventDateTime(currentEvent.startsAt)}</span>
        </p>
        {currentEvent.locationName ? (
          <p className="ui-text mb-0 mt-2 flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4 shrink-0 text-primary" />
            <span>{currentEvent.locationName}</span>
          </p>
        ) : null}

      </div>

      {currentEvent.posterSrc || currentEvent.imageUrl ? (
        <div className="px-2 pb-2">
          {currentEvent.isLiveStream && currentEvent.liveStreamUrl ? (
            <Link href={currentEvent.liveStreamUrl} rel="noreferrer" target="_blank">
              <div className="overflow-hidden rounded-[8px]">
                <img
                  alt={currentEvent.posterAlt ?? currentEvent.title}
                  className="block w-full"
                  src={currentEvent.posterSrc ?? currentEvent.imageUrl ?? ""}
                />
              </div>
            </Link>
          ) : (
            <div className="overflow-hidden rounded-[8px]">
              <img
                alt={currentEvent.posterAlt ?? currentEvent.title}
                className="block w-full"
                src={currentEvent.posterSrc ?? currentEvent.imageUrl ?? ""}
              />
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}
