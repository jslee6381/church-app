"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, FileText, MapPin } from "lucide-react";
import { formatEasternEventDate, formatEasternEventDateTime, formatEasternEventTime } from "@/lib/eastern-time";
import type { EventCarouselItem, EventListItem } from "@/lib/events";

type Props = {
  initialState: EventCarouselItem;
};

function isAllDayEvent(event: EventListItem) {
  const start = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(event.startsAt));
  const end = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(event.endsAt ?? event.startsAt));
  const startValues = Object.fromEntries(start.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const endValues = Object.fromEntries(end.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return startValues.hour === "00" && startValues.minute === "00" && endValues.hour === "23" && endValues.minute === "59";
}

function hasDifferentStartAndEndDate(event: EventListItem) {
  if (!event.endsAt) {
    return false;
  }

  return formatEasternEventDate(event.startsAt) !== formatEasternEventDate(event.endsAt);
}

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

async function fetchUpcomingEvent(index: number): Promise<EventCarouselItem | null> {
  try {
    const response = await fetch(`/api/home/upcoming-event?index=${index}`, {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as EventCarouselItem;
  } catch {
    return null;
  }
}

export function HomeUpcomingEventsCarousel({ initialState }: Props) {
  const router = useRouter();
  const [state, setState] = useState<EventCarouselItem | null>(initialState);
  const [isChanging, setIsChanging] = useState(false);

  async function moveTo(index: number) {
    setIsChanging(true);
    const nextState = await fetchUpcomingEvent(index);
    if (nextState) {
      setState(nextState);
    }
    setIsChanging(false);
  }

  if (!state?.item) {
    return null;
  }

  const currentEvent = state.item;
  const canGoPrevious = state.hasPrevious && !isChanging;
  const canGoNext = state.hasNext && !isChanging;
  const titleHref =
    currentEvent.isLiveStream && currentEvent.liveStreamUrl
      ? currentEvent.liveStreamUrl
      : `/events#event-${currentEvent.id}`;
  const titleIsExternal = Boolean(currentEvent.isLiveStream && currentEvent.liveStreamUrl);

  function openCurrentEvent() {
    if (titleIsExternal) {
      window.open(titleHref, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(titleHref);
  }

  return (
    <article className="home-surface overflow-hidden rounded-[16px] border border-border bg-card">
      <div className="px-4 pt-4 pb-4">
        <div className="mb-0">
          <div className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-1">
            <div className="flex justify-start">
              <button
                aria-label="Previous event"
                className="inline-flex size-8 items-center justify-center bg-transparent text-foreground disabled:opacity-35"
                disabled={!canGoPrevious}
                onClick={() => void moveTo(Math.max(0, state.index - 1))}
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
            </div>

            <div className="flex justify-end">
              <button
                aria-label="Next event"
                className="inline-flex size-8 items-center justify-center bg-transparent text-foreground disabled:opacity-35"
                disabled={!canGoNext}
                onClick={() => void moveTo(state.index + 1)}
                type="button"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-[32px_minmax(0,1fr)_32px] gap-1">
            <div aria-hidden="true" />
            <button
              className="block min-w-0 space-y-2 bg-transparent text-left"
              onClick={openCurrentEvent}
              type="button"
            >
              <p className="ui-text m-0 flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4 shrink-0 text-current" />
                <span>{isAllDayEvent(currentEvent) ? currentEvent.startsAt && new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(currentEvent.startsAt)) : formatEasternEventDateTime(currentEvent.startsAt)}</span>
              </p>
              {currentEvent.endsAt && (isAllDayEvent(currentEvent) ? hasDifferentStartAndEndDate(currentEvent) : true) ? (
                <p className="ui-text m-0 flex items-center gap-2 text-muted-foreground">
                  <span aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center text-current">-</span>
                  <span>{isAllDayEvent(currentEvent) ? formatEasternEventDate(currentEvent.endsAt) : `${formatEasternEventDate(currentEvent.endsAt)} at ${formatEasternEventTime(currentEvent.endsAt)}`}</span>
                </p>
              ) : null}
              {currentEvent.locationName ? (
                <p className="ui-text m-0 flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 shrink-0 text-current" />
                  <span>{currentEvent.locationName}</span>
                </p>
              ) : null}
              {currentEvent.summary ? (
                <p className="ui-text m-0 flex items-start gap-2 text-muted-foreground">
                  <FileText className="mt-0.5 size-4 shrink-0 text-current" />
                  <span>{currentEvent.summary}</span>
                </p>
              ) : null}
            </button>
            <div aria-hidden="true" />
          </div>
        </div>
      </div>
    </article>
  );
}
