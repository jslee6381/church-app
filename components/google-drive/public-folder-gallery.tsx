import { getEmbeddedGoogleDriveFolderUrl } from "@/lib/google-drive-public";

type Props = {
  emptyMessage: string;
  folderLink?: string | null;
  helperText?: string;
  mode?: "grid" | "list";
  title: string;
};

export function PublicFolderGallery({
  emptyMessage,
  folderLink,
  helperText,
  mode = "grid",
  title,
}: Props) {
  const embedUrl = getEmbeddedGoogleDriveFolderUrl(folderLink, mode);

  if (!embedUrl) {
    return (
      <section className="study-video-surface rounded-[18px] border border-border/80 bg-card px-4 py-5 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
        <p className="ui-text m-0 text-center text-muted-foreground">{emptyMessage}</p>
        {helperText ? <p className="ui-text mt-3 mb-0 text-center text-muted-foreground">{helperText}</p> : null}
      </section>
    );
  }

  return (
    <section className="study-video-surface overflow-hidden rounded-[18px] border border-border/80 bg-card shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
      <div className="border-b border-border/70 px-4 py-3">
        <p className="ui-text m-0 font-semibold text-foreground">{title}</p>
        {helperText ? <p className="ui-text mt-1 mb-0 text-muted-foreground">{helperText}</p> : null}
      </div>
      <div className="bg-card px-1 py-1">
        <iframe
          className="h-[68vh] min-h-[520px] w-full rounded-[14px] border-0 bg-card"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={embedUrl}
          title={title}
        />
      </div>
    </section>
  );
}
