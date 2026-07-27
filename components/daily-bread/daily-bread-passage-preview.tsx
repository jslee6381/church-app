"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";

type Verse = {
  verse: number;
  text: string;
};

type BiblePassageResponse = {
  verses?: Verse[];
  error?: string;
};

function normalizeVerseText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function DailyBreadPassagePreview({
  reference,
  verses,
}: {
  reference: string;
  verses: Verse[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadedVerses, setLoadedVerses] = useState<Verse[]>(verses);

  useEffect(() => {
    if (!isOpen || loadedVerses.length > 0 || isLoading) {
      return;
    }

    let isCancelled = false;

    const loadPassage = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/bible/passage?reference=${encodeURIComponent(reference)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load passage.");
        }

        const payload = (await response.json()) as BiblePassageResponse;

        if (!isCancelled) {
          setLoadedVerses(payload.verses ?? []);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load passage.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPassage();

    return () => {
      isCancelled = true;
    };
  }, [isLoading, isOpen, loadedVerses.length, reference]);

  return (
    <div className="event-form-input rounded-[16px] border border-input bg-white">
      <button
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-foreground"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="ui-text font-semibold text-foreground" style={{ fontSize: "calc(var(--ui-text-size) * 1.08)" }}>
          {reference}
        </span>
        {isOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {isOpen ? (
        <div className="border-t border-input px-4 py-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading passage...
            </div>
          ) : errorMessage ? (
            <p className="ui-text m-0 text-muted-foreground" style={{ fontSize: "calc(var(--ui-text-size) * 1.02)" }}>
              {errorMessage}
            </p>
          ) : loadedVerses.length > 0 ? (
            <div className="flex flex-col gap-4">
              {loadedVerses.map((verse) => (
                <p
                  className="ui-text m-0 text-foreground"
                  key={`${reference}-${verse.verse}`}
                  style={{ fontSize: "calc(var(--ui-text-size) * 1.02)", lineHeight: "1.8" }}
                >
                  <span
                    className="mr-2 font-semibold text-muted-foreground"
                    style={{ fontSize: "calc(var(--ui-text-size) * 0.88)" }}
                  >
                    {verse.verse}
                  </span>
                  {normalizeVerseText(verse.text)}
                </p>
              ))}
            </div>
          ) : (
            <p className="ui-text m-0 text-muted-foreground" style={{ fontSize: "calc(var(--ui-text-size) * 1.02)" }}>
              No passage text available.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
