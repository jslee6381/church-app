import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PassagePreview } from "@/components/video/passage-preview";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { fetchPassageVerses } from "@/lib/bible";
import { getDefaultChurchId } from "@/lib/church-context";
import { getVideoPostById } from "@/lib/videos";

type SearchParams = Promise<{
  kind?: string;
  reference?: string;
  id?: string;
}>;

function getSafeString(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export default async function MaterialDocumentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const kind = getSafeString(params.kind) ?? "Document";
  const reference = getSafeString(params.reference);
  const postId = getSafeString(params.id);
  const session = await getAuthenticatedMemberSession();
  const churchId = session?.member.church_id ?? (await getDefaultChurchId());
  const materialPost = postId && churchId
    ? await getVideoPostById(postId, churchId)
    : null;

  if (!postId || !materialPost) {
    notFound();
  }

  const sourceUrl = kind === "Question"
    ? materialPost.questionDocUrl ?? null
    : kind === "Message Manuscript"
      ? materialPost.manuscriptDocUrl ?? null
      : null;
  const documentMarkup = kind === "Question"
    ? materialPost.questionDocText ?? null
    : kind === "Message Manuscript"
      ? materialPost.manuscriptDocText ?? null
      : null;
  const questionPassageVerses = reference && kind === "Question"
    ? materialPost.passageVerses && materialPost.passageVerses.length > 0
      ? materialPost.passageVerses
      : await fetchPassageVerses(reference)
    : null;

  return (
    <main className="shell max-w-none py-6">
      <header className="mb-5">
        <Link className="inline-flex min-h-11 items-center text-base font-semibold text-foreground" href="/material" aria-label="Back to Material">
          <ChevronLeft className="size-6" />
        </Link>
      </header>

      <section className="space-y-6">
        {reference && kind === "Question" ? (
          <PassagePreview initialVerses={questionPassageVerses} reference={reference} />
        ) : null}

        <div className="pb-10">
          {documentMarkup ? (
            <div className="material-doc-view" dangerouslySetInnerHTML={{ __html: documentMarkup }} />
          ) : sourceUrl ? (
            <iframe
              className="min-h-[88vh] w-full border-0 bg-transparent"
              src={sourceUrl}
              title={kind}
            />
          ) : (
            <p className="ui-text m-0 px-4 text-sm text-muted-foreground">Document is unavailable.</p>
          )}
        </div>
      </section>

      <style>{`
        .material-doc-view {
          width: 100%;
        }

        .material-doc-line {
          margin: 0;
          color: hsl(var(--foreground));
          font-family: var(--font-ui, inherit);
          font-size: 1.02rem;
          line-height: 1.7;
          white-space: normal;
          word-break: keep-all;
          overflow-wrap: anywhere;
        }

        .material-doc-line strong {
          font-weight: 700;
        }

        .material-doc-line em {
          font-style: italic;
        }

        .material-doc-line + .material-doc-line {
          margin-top: 0.1rem;
        }

        .material-doc-line.gap-md {
          margin-top: 0.8rem;
        }

        .material-doc-line.gap-lg,
        .material-doc-line.gap-xl {
          margin-top: 1.35rem;
        }

        .material-doc-line.is-center {
          text-align: center;
        }

        .material-doc-line.is-heading {
          font-weight: 700;
        }

        .material-doc-line.has-prefix {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 0.35rem;
          align-items: start;
        }

        .material-doc-prefix {
          white-space: pre;
          font-weight: 600;
        }

        .material-doc-body {
          min-width: 0;
        }

        .material-doc-line.indent-1,
        .material-doc-line.indent-2 {
          padding-left: 0;
        }

        .material-doc-table-wrap {
          width: 100%;
          overflow-x: auto;
          margin-top: 1rem;
          margin-bottom: 1rem;
        }

        .material-doc-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .material-doc-table td {
          border: 1px solid rgba(120, 120, 120, 0.5);
          padding: 0.6rem 0.5rem;
          vertical-align: top;
          color: hsl(var(--foreground));
          font-family: var(--font-ui, inherit);
          font-size: 0.98rem;
          line-height: 1.5;
          white-space: normal;
          word-break: keep-all;
          overflow-wrap: anywhere;
        }

        .material-doc-table td strong {
          font-weight: 700;
        }

        .material-doc-table td em {
          font-style: italic;
        }

        @media (min-width: 640px) {
          .material-doc-line.indent-1 {
            padding-left: 1.6rem;
          }

          .material-doc-line.indent-2 {
            padding-left: 3.2rem;
          }
        }
      `}</style>
    </main>
  );
}
