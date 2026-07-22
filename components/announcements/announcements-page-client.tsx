"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MoreVertical, Plus } from "lucide-react";

type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
};

type Props = {
  initialAnnouncements: AnnouncementItem[];
  canCompose: boolean;
};

const TITLE_LIMIT = 50;
const CONTENT_LIMIT = 150;

export function AnnouncementsPageClient({ initialAnnouncements, canCompose }: Props) {
  const router = useRouter();
  const composerRef = useRef<HTMLDivElement | null>(null);
  const menuAreaRef = useRef<HTMLDivElement | null>(null);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuAnnouncementId, setOpenMenuAnnouncementId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setAnnouncements(initialAnnouncements);
  }, [initialAnnouncements]);

  useEffect(() => {
    if (!isComposerOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isComposerOpen]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  useEffect(() => {
    if (!openMenuAnnouncementId) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuAreaRef.current?.contains(event.target as Node)) {
        setOpenMenuAnnouncementId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openMenuAnnouncementId]);

  function resetForm() {
    setTitle("");
    setBody("");
    setImageFile(null);
    setImagePreviewUrl(null);
    setExistingImageUrl(null);
    setRemoveExistingImage(false);
    setEditingId(null);
    setIsComposerOpen(false);
  }

  function clearSelectedImage() {
    setImageFile(null);
    setImagePreviewUrl(null);
  }

  function removeCurrentImage() {
    setImageFile(null);
    setImagePreviewUrl(null);
    setExistingImageUrl(null);
    setRemoveExistingImage(true);
  }

  function startEditing(item: AnnouncementItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body);
    setImageFile(null);
    setImagePreviewUrl(null);
    setExistingImageUrl(item.imageUrl ?? null);
    setRemoveExistingImage(false);
    setIsComposerOpen(false);
    setOpenMenuAnnouncementId(null);
  }

  function resetInlineEdit() {
    setTitle("");
    setBody("");
    setImageFile(null);
    setImagePreviewUrl(null);
    setExistingImageUrl(null);
    setRemoveExistingImage(false);
    setEditingId(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextBody = body.trim();

    if (!nextTitle || !nextBody) {
      return;
    }

    setIsSaving(true);

    try {
      if (editingId) {
        const formData = new FormData();
        formData.set("title", nextTitle);
        formData.set("body", nextBody);
        formData.set("removeImage", String(removeExistingImage && !imageFile));

        if (imageFile) {
          formData.set("image", imageFile);
        }

        const response = await fetch(`/api/announcements/${editingId}`, {
          method: "PATCH",
          body: formData,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to update announcement.");
        }

        setAnnouncements((current) =>
          current.map((item) =>
            item.id === editingId
              ? {
                  id: payload.announcement.id,
                  title: payload.announcement.title,
                  body: payload.announcement.body,
                  imageUrl: payload.announcement.image_url ?? null,
                }
              : item,
          ),
        );
        resetInlineEdit();
        router.refresh();
      } else {
        const formData = new FormData();
        formData.set("title", nextTitle);
        formData.set("body", nextBody);

        if (imageFile) {
          formData.set("image", imageFile);
        }

        const response = await fetch("/api/announcements", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to create announcement.");
        }

        setAnnouncements((current) => [
          {
            id: payload.announcement.id,
            title: payload.announcement.title,
            body: payload.announcement.body,
            imageUrl: payload.announcement.image_url ?? null,
          },
          ...current,
        ]);
        resetForm();
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteAnnouncement(announcementId: string) {
    setDeletingId(announcementId);

    try {
      const response = await fetch(`/api/announcements/${announcementId}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete announcement.");
      }

      setAnnouncements((current) => current.filter((item) => item.id !== announcementId));
      if (editingId === announcementId) {
        resetInlineEdit();
      }
      setOpenMenuAnnouncementId(null);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-4">
      {canCompose ? (
        <div
          ref={composerRef}
          className="rounded-[18px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] p-4 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]"
        >
          <div className="flex items-center justify-center">
            <button
              aria-label={isComposerOpen ? "Close announcement form" : "Create announcement"}
              className="inline-flex size-11 items-center justify-center rounded-full border border-border/80 bg-white text-foreground"
              onClick={() => setIsComposerOpen((current) => !current)}
              type="button"
            >
              <Plus className={`size-5 transition-transform ${isComposerOpen ? "rotate-45" : ""}`} />
            </button>
          </div>

          {isComposerOpen ? (
            <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
              <div className="relative">
                <input
                  className="min-h-12 w-full rounded-[16px] border border-input bg-white px-4 py-3 pr-16"
                  maxLength={TITLE_LIMIT}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Title"
                  value={title}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {title.length}/{TITLE_LIMIT}
                </span>
              </div>

              <div className="relative">
                <textarea
                  className="min-h-[110px] w-full rounded-[16px] border border-input bg-white px-4 py-3 pb-8"
                  maxLength={CONTENT_LIMIT}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Content"
                  value={body}
                />
                <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
                  {body.length}/{CONTENT_LIMIT}
                </span>
              </div>

              <label className="grid gap-2 text-sm font-medium text-muted-foreground">
                Image optional, JPG/PNG/WEBP up to 8 MB
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-accent-foreground"
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>

              {imagePreviewUrl ? (
                <div className="grid gap-3 rounded-[16px] border border-border/70 bg-white p-3">
                  <img alt="Announcement preview" className="block w-full rounded-[12px]" src={imagePreviewUrl} />
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-border/80 bg-white px-4 text-sm font-semibold text-foreground"
                    onClick={() => setImageFile(null)}
                    type="button"
                  >
                    Remove image
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <button
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-[16px] border border-border/80 bg-white px-5 text-base font-semibold text-foreground"
                  onClick={resetForm}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-[16px] bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? <LoaderCircle className="size-5 animate-spin" /> : "Post"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <article className="rounded-[18px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] px-4 py-4 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
            <p className="ui-text m-0 text-center text-muted-foreground">No announcement</p>
          </article>
        ) : (
          announcements.map((item) => (
            <article
              className={`relative rounded-[18px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] px-4 pt-4 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)] ${
                item.imageUrl ? "pb-0" : "pb-4"
              }`}
              key={item.id}
            >
              {canCompose && editingId !== item.id ? (
                <div ref={openMenuAnnouncementId === item.id ? menuAreaRef : null} className="absolute right-3 top-3 z-10">
                  <div className="relative">
                    <button
                      aria-label="Announcement actions"
                      className="inline-flex size-10 items-center justify-center bg-transparent text-foreground"
                      onClick={() =>
                        setOpenMenuAnnouncementId((current) => (current === item.id ? null : item.id))
                      }
                      type="button"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {openMenuAnnouncementId === item.id ? (
                      <div className="absolute right-0 top-[calc(100%+0.25rem)] z-20 min-w-[144px] overflow-hidden rounded-[14px] border border-border/80 bg-white shadow-[0_10px_30px_rgba(68,52,35,0.12)]">
                        <button
                          className="flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold text-foreground"
                          onClick={() => startEditing(item)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold text-foreground disabled:opacity-60"
                          disabled={deletingId === item.id}
                          onClick={() => void deleteAnnouncement(item.id)}
                          type="button"
                        >
                          {deletingId === item.id ? <LoaderCircle className="size-4 animate-spin" /> : "Delete"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {editingId === item.id ? (
                <form className="grid gap-3" onSubmit={handleSubmit}>
                  <div className="relative">
                    <input
                      className="min-h-12 w-full rounded-[16px] border border-input bg-white px-4 py-3 pr-16"
                      maxLength={TITLE_LIMIT}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Title"
                      value={title}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {title.length}/{TITLE_LIMIT}
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      className="min-h-[110px] w-full rounded-[16px] border border-input bg-white px-4 py-3 pb-8"
                      maxLength={CONTENT_LIMIT}
                      onChange={(event) => setBody(event.target.value)}
                      placeholder="Content"
                      value={body}
                    />
                    <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
                      {body.length}/{CONTENT_LIMIT}
                    </span>
                  </div>

                  <label className="grid gap-2 text-sm font-medium text-muted-foreground">
                    Image optional, JPG/PNG/WEBP up to 8 MB
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-accent-foreground"
                      onChange={(event) => {
                        const nextFile = event.target.files?.[0] ?? null;
                        setImageFile(nextFile);
                        setRemoveExistingImage(false);
                      }}
                      type="file"
                    />
                  </label>

                  {imagePreviewUrl || existingImageUrl ? (
                    <div className="grid gap-3 rounded-[16px] border border-border/70 bg-white p-3">
                      <img alt="Announcement preview" className="block w-full rounded-[12px]" src={imagePreviewUrl ?? existingImageUrl ?? ""} />
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-border/80 bg-white px-4 text-sm font-semibold text-foreground"
                          onClick={imagePreviewUrl ? clearSelectedImage : removeCurrentImage}
                          type="button"
                        >
                          {imagePreviewUrl ? "Clear selected image" : "Remove image"}
                        </button>
                        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[14px] bg-primary px-4 text-sm font-semibold text-primary-foreground">
                          Replace image
                          <input
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(event) => {
                              const nextFile = event.target.files?.[0] ?? null;
                              setImageFile(nextFile);
                              setRemoveExistingImage(false);
                            }}
                            type="file"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-[16px] border border-border/80 bg-white px-5 text-base font-semibold text-foreground"
                      onClick={resetInlineEdit}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-[16px] bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-60"
                      disabled={isSaving}
                      type="submit"
                    >
                      {isSaving ? <LoaderCircle className="size-5 animate-spin" /> : "Save"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h2 className="ui-text m-0 pr-10 font-sans font-semibold leading-tight text-foreground">
                    {item.title}
                  </h2>

                  <p className="ui-text mt-3 mb-0 text-muted-foreground">{item.body}</p>

                  {item.imageUrl ? (
                    <div className="mt-4 -mx-4">
                      <img
                        alt={item.title}
                        className="block w-full rounded-b-[18px]"
                        src={item.imageUrl}
                      />
                    </div>
                  ) : null}
                </>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
