"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
};

type Props = {
  announcements: AnnouncementItem[];
};

export function HomeAnnouncementsCarousel({ announcements }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (announcements.length === 0) {
    return (
      <article className="overflow-hidden rounded-[16px] border border-border bg-white/72">
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

  const currentAnnouncement = announcements[currentIndex];
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < announcements.length - 1;

  return (
    <article className="overflow-hidden rounded-[16px] border border-border bg-white/72">
      <div className="pt-4 pb-4">
        <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-start gap-3">
          <div className="flex justify-start">
            <button
              aria-label="Previous announcement"
              className="inline-flex size-10 items-center justify-center bg-transparent text-foreground disabled:opacity-35"
              disabled={!canGoPrevious}
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
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
              className="inline-flex size-10 items-center justify-center bg-transparent text-foreground disabled:opacity-35"
              disabled={!canGoNext}
              onClick={() => setCurrentIndex((index) => Math.min(announcements.length - 1, index + 1))}
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
