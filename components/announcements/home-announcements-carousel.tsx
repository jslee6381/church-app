"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AnnouncementCarouselItem } from "@/lib/announcements";

type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
};

async function fetchAnnouncement(index: number): Promise<AnnouncementCarouselItem | null> {
  try {
    const response = await fetch(`/api/home/announcement?index=${index}`, {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AnnouncementCarouselItem;
  } catch {
    return null;
  }
}

type Props = {
  initialState: AnnouncementCarouselItem;
};

export function HomeAnnouncementsCarousel({ initialState }: Props) {
  const [state, setState] = useState<AnnouncementCarouselItem | null>(initialState);
  const [isChanging, setIsChanging] = useState(false);

  async function moveTo(index: number) {
    setIsChanging(true);
    const nextState = await fetchAnnouncement(index);
    if (nextState) {
      setState(nextState);
    }
    setIsChanging(false);
  }

  if (!state?.item) {
    return (
      <article className="home-surface overflow-hidden rounded-[16px] border border-border bg-card">
        <div className="pt-4 pb-4">
          <Link
            className="ui-text block text-center text-muted-foreground underline decoration-border underline-offset-4 transition hover:text-primary"
            href="/announcements"
          >
            No announcement
          </Link>
        </div>
      </article>
    );
  }

  const currentAnnouncement: AnnouncementItem = state.item;
  const canGoPrevious = state.hasPrevious && !isChanging;
  const canGoNext = state.hasNext && !isChanging;

  return (
    <article className="home-surface overflow-hidden rounded-[16px] border border-border bg-card">
      <div className="pt-4 pb-4">
        <div className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-start gap-1">
          <div className="flex justify-start">
            <button
              aria-label="Previous announcement"
              className="inline-flex size-8 items-center justify-center bg-transparent text-foreground disabled:opacity-35"
              disabled={!canGoPrevious}
              onClick={() => void moveTo(Math.max(0, state.index - 1))}
              type="button"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="min-w-0 text-center">
            <Link
              className="ui-text inline-block whitespace-normal break-words text-center font-sans font-semibold leading-tight text-foreground underline decoration-border underline-offset-4 transition hover:text-primary"
              href="/announcements"
            >
              {currentAnnouncement.title}
            </Link>
            <p className="ui-text mt-2 mb-0 whitespace-pre-wrap text-left text-muted-foreground">{currentAnnouncement.body}</p>
          </div>

          <div className="flex justify-end">
            <button
              aria-label="Next announcement"
              className="inline-flex size-8 items-center justify-center bg-transparent text-foreground disabled:opacity-35"
              disabled={!canGoNext}
              onClick={() => void moveTo(state.index + 1)}
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
