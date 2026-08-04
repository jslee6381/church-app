import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { DailyBreadPassagePreview } from "@/components/daily-bread/daily-bread-passage-preview";
import { formatEasternEventDate, getCurrentEasternDateValue } from "@/lib/eastern-time";
import {
  getDailyBreadAdjacentDate,
  getDailyBreadContent,
  getDailyBreadEntryForDate,
} from "@/lib/daily-bread";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{
  date?: string;
}>;

function getSafeDateValue(value?: string) {
  if (!value) {
    return getCurrentEasternDateValue();
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : getCurrentEasternDateValue();
}

export default async function DailyBreadPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const todayValue = getCurrentEasternDateValue();
  const selectedDateValue = getSafeDateValue(params.date);
  const content = await getDailyBreadContent(selectedDateValue);

  if (!content) {
    notFound();
  }

  const minDateValue = getDailyBreadAdjacentDate(todayValue, "previous");
  const maxDateValue = getDailyBreadAdjacentDate(todayValue, "next");
  const [previousEntry, nextEntry] = await Promise.all([
    getDailyBreadEntryForDate(minDateValue),
    getDailyBreadEntryForDate(maxDateValue),
  ]);
  return (
    <main className="shell max-w-[560px] py-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <Link
          className="ui-text inline-flex min-h-11 items-center bg-transparent px-0 font-semibold text-foreground"
          href="/home"
          aria-label="Back to Home"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <p className="ui-text m-0 text-right text-foreground">{formatEasternEventDate(content.dateValue)}</p>
      </header>

      <section className="space-y-5 pb-8">
        <div>
          <h2
            className="text-center font-sans leading-tight font-semibold text-foreground"
            style={{ fontSize: "calc(var(--ui-text-size) * 1.5)" }}
          >
            {content.title}
          </h2>
        </div>

        <DailyBreadPassagePreview keyVerse={content.keyVerse} reference={content.passageReference} verses={content.verses} />

        <div className="space-y-6">
          {content.bodyParagraphs.map((paragraph, index) => (
            <p
              className="ui-text m-0 text-foreground"
              key={`${content.id}-paragraph-${index}`}
              style={{ fontSize: "calc(var(--ui-text-size) * 1.02)", lineHeight: "1.5" }}
            >
              {paragraph}
            </p>
          ))}
        </div>

        {content.application ? (
          <p className="ui-text mt-4 text-foreground" style={{ fontSize: "calc(var(--ui-text-size) * 1.02)", lineHeight: "1.5" }}>
            <span className="font-semibold">Prayer:</span> {content.application}
          </p>
        ) : null}

        {content.oneWord ? (
          <p className="ui-text mt-4 text-foreground" style={{ fontSize: "calc(var(--ui-text-size) * 1.02)", lineHeight: "1.5" }}>
            <span className="font-semibold">One Word:</span> {content.oneWord}
          </p>
        ) : null}

        <div className="grid grid-cols-3 gap-3 pt-2">
          {previousEntry ? (
            <Link
              className="ui-text inline-flex min-h-11 items-center justify-center rounded-[14px] border border-input bg-card px-3 text-center font-semibold text-foreground transition hover:bg-card"
              href={`/daily-bread?date=${previousEntry.dateValue}`}
              style={{ fontSize: "calc(var(--ui-text-size) * 1.02)" }}
            >
              Yesterday
            </Link>
          ) : (
            <button
              className="ui-text inline-flex min-h-11 items-center justify-center rounded-[14px] border border-input bg-card px-3 text-center font-semibold text-muted-foreground opacity-55"
              disabled
              style={{ fontSize: "calc(var(--ui-text-size) * 1.02)" }}
              type="button"
            >
              Yesterday
            </button>
          )}

          <Link
            className="daily-bread-today-button ui-text inline-flex min-h-11 items-center justify-center rounded-[14px] border border-transparent bg-primary px-3 text-center font-semibold transition hover:bg-primary"
            href={`/daily-bread?date=${todayValue}`}
            style={{ fontSize: "calc(var(--ui-text-size) * 1.02)" }}
          >
            Today
          </Link>

          {nextEntry ? (
            <Link
              className="ui-text inline-flex min-h-11 items-center justify-center rounded-[14px] border border-input bg-card px-3 text-center font-semibold text-foreground transition hover:bg-card"
              href={`/daily-bread?date=${nextEntry.dateValue}`}
              style={{ fontSize: "calc(var(--ui-text-size) * 1.02)" }}
            >
              Tomorrow
            </Link>
          ) : (
            <button
              className="ui-text inline-flex min-h-11 items-center justify-center rounded-[14px] border border-input bg-card px-3 text-center font-semibold text-muted-foreground opacity-55"
              disabled
              style={{ fontSize: "calc(var(--ui-text-size) * 1.02)" }}
              type="button"
            >
              Tomorrow
            </button>
          )}
        </div>
      </section>

      <style>{`
        :root[data-theme="light"] .daily-bread-today-button {
          color: #ffffff;
        }

        :root[data-theme="dark"] .daily-bread-today-button {
          color: #000000;
        }
      `}</style>
    </main>
  );
}
