import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { PassagePreview } from "@/components/video/passage-preview";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
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

function getViewerUrl(sourceUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(sourceUrl)}`;
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

  return (
    <main className="shell max-w-none py-6">
      <header className="mb-5">
        <Link className="inline-flex items-center gap-2 text-base font-semibold text-foreground" href="/video">
          <ArrowLeft className="size-4" />
          Material
        </Link>
      </header>

      <section className="space-y-6">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <FileText className="size-4" />
          {kind}
        </div>

        {reference && kind === "Question" ? (
          <PassagePreview initialVerses={materialPost?.passageVerses ?? null} reference={reference} />
        ) : null}

        <div className="-mx-4 pb-10 sm:-mx-5">
          {sourceUrl ? (
            <iframe
              className="min-h-[82vh] w-full border-0 bg-transparent"
              src={getViewerUrl(sourceUrl)}
              title={kind}
            />
          ) : (
            <p className="ui-text m-0 px-4 text-sm text-muted-foreground">Document is unavailable.</p>
          )}
        </div>
      </section>
    </main>
  );
}
