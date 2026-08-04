"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";

type BibleApiVerse = {
  chapter?: number;
  verse: number;
  text: string;
};

type BiblePassageResponse = {
  verses?: BibleApiVerse[];
  error?: string;
};

function normalizeVerseText(text: string) {
  return text
    .replace(/\[[a-z]+\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function PassagePreview({
  reference,
  initialVerses,
}: {
  reference: string;
  initialVerses?: BibleApiVerse[] | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verses, setVerses] = useState<BibleApiVerse[]>(initialVerses ?? []);

  useEffect(() => {
    if (!isOpen || verses.length > 0 || isLoading) {
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
          setVerses(payload.verses ?? []);
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
  }, [isLoading, isOpen, reference, verses.length]);

  return (
    <div className="border-b border-input pb-3">
      <button
        className="flex min-h-12 w-full items-center gap-2 px-0 text-left text-foreground"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="ui-text text-sm font-semibold text-foreground">{reference}</span>
        {isOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {isOpen ? (
        <div className="px-0 pt-2">
          {isLoading ? (
            <div
              className="flex items-center gap-2 text-muted-foreground"
              style={{ fontSize: "calc(var(--ui-text-size) * 1.02)" }}
            >
              <LoaderCircle className="size-4 animate-spin" />
              Loading passage...
            </div>
          ) : errorMessage ? (
            <p className="ui-text m-0 text-muted-foreground" style={{ fontSize: "calc(var(--ui-text-size) * 1.02)" }}>
              {errorMessage}
            </p>
          ) : verses.length > 0 ? (
            <div className="border-b border-input pb-3">
              <div className="flex flex-col gap-3">
                {verses.map((verse, index) => (
                  <div className="space-y-1" key={`${reference}-${verse.chapter ?? "x"}-${verse.verse}`}>
                    {verse.chapter && verse.chapter !== verses[index - 1]?.chapter ? (
                      <p
                        className="ui-text m-0 font-semibold text-foreground"
                        style={{ fontSize: "calc(var(--ui-text-size) * 0.96)", lineHeight: "1.5" }}
                      >
                        Chapter {verse.chapter}
                      </p>
                    ) : null}
                    <p
                      className="ui-text m-0 text-foreground"
                      style={{ fontSize: "calc(var(--ui-text-size) * 1.02)", lineHeight: "1.65" }}
                    >
                      <span
                        className="mr-2 font-semibold text-foreground"
                        style={{ fontSize: "calc(var(--ui-text-size) * 0.88)" }}
                      >
                        {verse.verse}
                      </span>
                      {normalizeVerseText(verse.text)}
                    </p>
                  </div>
                ))}
              </div>
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
