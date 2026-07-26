import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { PassagePreview } from "@/components/video/passage-preview";

type SearchParams = Promise<{
  title?: string;
  url?: string;
  kind?: string;
  reference?: string;
}>;

function getSafeString(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function getViewerUrl(sourceUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(sourceUrl)}`;
}

export default async function MaterialDocumentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const title = getSafeString(params.title);
  const sourceUrl = getSafeString(params.url);
  const kind = getSafeString(params.kind) ?? "Document";
  const reference = getSafeString(params.reference);

  if (!title || !sourceUrl) {
    notFound();
  }

  return (
    <main className="shell max-w-[860px] py-6">
      <header className="mb-5">
        <Link className="inline-flex items-center gap-2 text-base font-semibold text-foreground" href="/video">
          <ArrowLeft className="size-4" />
          Material
        </Link>
      </header>

      <section className="event-card-surface overflow-hidden rounded-[18px] border border-border/80 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <FileText className="size-4" />
              {kind}
            </div>
            <h1 className="ui-text mt-2 mb-0 break-words text-[1.2rem] font-semibold text-foreground">{title}</h1>
          </div>

          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-border/80 px-4 text-sm font-semibold text-foreground"
            href={sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink className="size-4" />
            Open Original
          </Link>
        </div>

        {reference && kind === "Question" ? (
          <div className="border-b border-border/70 px-4 py-4">
            <PassagePreview reference={reference} />
          </div>
        ) : null}

        <div className="bg-background p-3">
          <iframe
            className="min-h-[72vh] w-full rounded-[14px] border border-border/70 bg-white"
            src={getViewerUrl(sourceUrl)}
            title={title}
          />
        </div>
      </section>
    </main>
  );
}
