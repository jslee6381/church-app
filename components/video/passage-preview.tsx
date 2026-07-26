"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";

type BibleApiVerse = {
  verse: number;
  text: string;
};

type BiblePassageResponse = {
  verses?: BibleApiVerse[];
  error?: string;
};

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
          cache: "force-cache",
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
    <div className="rounded-[16px] border border-border/80 bg-background/70">
      <button
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="ui-text text-sm font-semibold text-foreground">{reference}</span>
        {isOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {isOpen ? (
        <div className="border-t border-border/70 px-4 py-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading passage...
            </div>
          ) : errorMessage ? (
            <p className="ui-text m-0 text-sm text-muted-foreground">{errorMessage}</p>
          ) : verses.length > 0 ? (
            <div className="space-y-2">
              {verses.map((verse) => (
                <p className="ui-text m-0 text-sm leading-6 text-foreground" key={`${reference}-${verse.verse}`}>
                  <span className="mr-2 text-xs font-semibold text-muted-foreground">{verse.verse}</span>
                  {verse.text.trim()}
                </p>
              ))}
            </div>
          ) : (
            <p className="ui-text m-0 text-sm text-muted-foreground">No passage text available.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
