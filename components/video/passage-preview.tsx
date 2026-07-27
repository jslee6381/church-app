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
  return text.replace(/\s+/g, " ").trim();
}

const NIV_COPYRIGHT_NOTICE =
  "Scripture quotations taken from the Holy Bible, New International Version®, NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc. Used with permission. All rights reserved worldwide.";

function getVerseLabel(
  verse: BibleApiVerse,
  previousVerse?: BibleApiVerse,
) {
  if (verse.chapter && verse.chapter !== previousVerse?.chapter) {
    return `${verse.chapter}:${verse.verse}`;
  }

  return String(verse.verse);
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading passage...
            </div>
          ) : errorMessage ? (
            <p className="ui-text m-0 text-sm text-muted-foreground">{errorMessage}</p>
          ) : verses.length > 0 ? (
            <div className="flex flex-col gap-4">
              {verses.map((verse, index) => (
                <p className="ui-text m-0 text-sm leading-7 text-foreground" key={`${reference}-${verse.chapter ?? "x"}-${verse.verse}`}>
                  <span className="mr-2 text-xs font-semibold text-muted-foreground">
                    {getVerseLabel(verse, index > 0 ? verses[index - 1] : undefined)}
                  </span>
                  {normalizeVerseText(verse.text)}
                </p>
              ))}
              <p className="ui-text m-0 pt-3 text-muted-foreground" style={{ fontSize: "11px", lineHeight: "1.5" }}>
                {NIV_COPYRIGHT_NOTICE}
              </p>
            </div>
          ) : (
            <p className="ui-text m-0 text-sm text-muted-foreground">No passage text available.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
