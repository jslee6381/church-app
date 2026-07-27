"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";

type Verse = {
  chapter?: number;
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

const NIV_COPYRIGHT_NOTICE =
  "Scripture quotations taken from the Holy Bible, New International Version®, NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc. Used with permission. All rights reserved worldwide.";

function getVerseLabel(
  verse: Verse,
  previousVerse?: Verse,
) {
  if (verse.chapter && verse.chapter !== previousVerse?.chapter) {
    return `${verse.chapter}:${verse.verse}`;
  }

  return String(verse.verse);
}

export function DailyBreadPassagePreview({
  reference,
  keyVerse,
  verses,
}: {
  reference: string;
  keyVerse: string;
  verses: Verse[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadedVerses, setLoadedVerses] = useState<Verse[]>(verses);

  useEffect(() => {
    setLoadedVerses(verses);
    setErrorMessage(null);
    setIsLoading(false);
  }, [reference, verses]);

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
    <div>
      <button
        className="flex min-h-12 w-full items-center gap-2 px-0 text-left text-foreground"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="ui-text font-semibold text-foreground" style={{ fontSize: "calc(var(--ui-text-size) * 1.02)" }}>
          {reference}
        </span>
        {isOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      <p className="ui-text m-0 text-foreground" style={{ fontSize: "calc(var(--ui-text-size) * 1.02)" }}>
        <span className="font-semibold">Key Verse:</span> {keyVerse}
      </p>

      <div className="mt-3 border-b border-input" />

      {isOpen ? (
        <div className="px-0 pt-3">
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
          ) : loadedVerses.length > 0 ? (
            <div className="border-b border-input pb-3">
              <div className="flex flex-col gap-3">
                {loadedVerses.map((verse, index) => (
                  <p
                    className="ui-text m-0 text-foreground"
                    key={`${reference}-${verse.chapter ?? "x"}-${verse.verse}`}
                    style={{ fontSize: "calc(var(--ui-text-size) * 1.02)", lineHeight: "1.65" }}
                  >
                    <span
                      className="mr-2 font-semibold text-muted-foreground"
                      style={{ fontSize: "calc(var(--ui-text-size) * 0.88)" }}
                    >
                      {getVerseLabel(verse, index > 0 ? loadedVerses[index - 1] : undefined)}
                    </span>
                    {normalizeVerseText(verse.text)}
                  </p>
                ))}
              </div>
              <p className="ui-text m-0 pt-3 text-muted-foreground" style={{ fontSize: "11px", lineHeight: "1.5" }}>
                {NIV_COPYRIGHT_NOTICE}
              </p>
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
