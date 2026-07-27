"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LoaderCircle, MoreVertical, Plus, X } from "lucide-react";

type GalleryImageItem = {
  id: string;
  imageUrl: string;
  viewUrl: string;
};

type GalleryPostItem = {
  id: string;
  title: string;
  body: string | null;
  driveLink: string;
  embedUrl: string;
  images: GalleryImageItem[];
  createdAt: string | null;
};

type Props = {
  initialPosts: GalleryPostItem[];
  canCompose: boolean;
};

type GalleryImagesPayload = {
  images?: GalleryImageItem[];
  error?: string;
};

const TITLE_LIMIT = 50;
const CONTENT_LIMIT = 150;
const MIN_TEXTAREA_HEIGHT = 44;
const MAX_TEXTAREA_HEIGHT = 160;

function preventImageSaveActions(event: React.SyntheticEvent<HTMLElement>) {
  event.preventDefault();
}

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;

  textarea.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
  textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
}

function GalleryImageStrip({
  isOpen,
  onOpenLightbox,
  post,
}: {
  isOpen: boolean;
  onOpenLightbox: (imageUrls: string[], index: number) => void;
  post: GalleryPostItem;
}) {
  const [images, setImages] = useState(post.images);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(post.images.length > 0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setImages(post.images);
    setHasAttemptedLoad(post.images.length > 0);
    setIsLoading(false);
    setLoadError(false);
  }, [post.id, post.images]);

  useEffect(() => {
    if (!isOpen || images.length > 0 || hasAttemptedLoad) {
      return;
    }

    let isCancelled = false;
    const loadImages = async () => {
      setHasAttemptedLoad(true);
      setIsLoading(true);
      setLoadError(false);

      try {
        const response = await fetch(`/api/gallery/${post.id}/images`, {
          cache: "force-cache",
        });
        const payload = (await response.json()) as GalleryImagesPayload;

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load gallery images.");
        }

        if (!isCancelled) {
          setImages(payload.images ?? []);
        }
      } catch {
        if (!isCancelled) {
          setLoadError(true);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadImages();

    return () => {
      isCancelled = true;
    };
  }, [hasAttemptedLoad, images.length, isOpen, post.id]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="mt-4">
      {images.length > 0 ? (
        <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
          {(() => {
            const imageUrls = images.map((image) => image.imageUrl);

            return images.map((image, index) => (
              <button
                className="block min-w-[88%] snap-center overflow-hidden rounded-[16px] sm:min-w-[380px]"
                key={image.id}
                onClick={() => onOpenLightbox(imageUrls, index)}
                type="button"
              >
                <img
                  alt={`${post.title} photo ${index + 1}`}
                  className="pointer-events-none block h-[220px] w-full select-none object-cover sm:h-[240px]"
                  draggable={false}
                  loading="lazy"
                  onContextMenu={preventImageSaveActions}
                  referrerPolicy="no-referrer"
                  src={image.imageUrl}
                />
              </button>
            ));
          })()}
        </div>
      ) : isLoading ? (
        <div className="flex min-h-[220px] items-center justify-center sm:min-h-[240px]">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : loadError ? (
        <div className="py-2">
          <p className="ui-text m-0 text-center text-muted-foreground">Unable to load gallery images right now.</p>
        </div>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center sm:min-h-[240px]">
          <p className="ui-text m-0 text-center text-muted-foreground">Loading gallery preview...</p>
        </div>
      )}
    </div>
  );
}

export function GalleryPageClient({ initialPosts, canCompose }: Props) {
  const router = useRouter();
  const composerRef = useRef<HTMLDivElement | null>(null);
  const menuAreaRef = useRef<HTMLDivElement | null>(null);
  const lightboxTouchStartXRef = useRef<number | null>(null);
  const [posts, setPosts] = useState(initialPosts);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxState, setLightboxState] = useState<{ imageUrls: string[]; index: number } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [expandedPostIds, setExpandedPostIds] = useState<string[]>([]);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    if (!openMenuPostId) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuAreaRef.current?.contains(event.target as Node)) {
        setOpenMenuPostId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openMenuPostId]);

  useEffect(() => {
    if (!lightboxState) {
      document.body.style.removeProperty("overflow");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxState(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        setLightboxState((current) =>
          current
            ? {
                ...current,
                index: current.index === 0 ? current.imageUrls.length - 1 : current.index - 1,
              }
            : current,
        );
      }

      if (event.key === "ArrowRight") {
        setLightboxState((current) =>
          current
            ? {
                ...current,
                index: current.index === current.imageUrls.length - 1 ? 0 : current.index + 1,
              }
            : current,
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxState]);

  function resetForm() {
    setTitle("");
    setBody("");
    setDriveLink("");
    setEditingId(null);
    setIsComposerOpen(false);
  }

  function resetInlineEdit() {
    setTitle("");
    setBody("");
    setDriveLink("");
    setEditingId(null);
  }

  function startEditing(item: GalleryPostItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body ?? "");
    setDriveLink(item.driveLink);
    setOpenMenuPostId(null);
  }

  function openLightbox(imageUrls: string[], index: number) {
    setLightboxState({ imageUrls, index });
  }

  function togglePostExpansion(postId: string) {
    setExpandedPostIds((current) =>
      current.includes(postId)
        ? current.filter((item) => item !== postId)
        : [...current, postId],
    );
  }

  function showPreviousLightboxImage() {
    setLightboxState((current) =>
      current
        ? {
            ...current,
            index: current.index === 0 ? current.imageUrls.length - 1 : current.index - 1,
          }
        : current,
    );
  }

  function showNextLightboxImage() {
    setLightboxState((current) =>
      current
        ? {
            ...current,
            index: current.index === current.imageUrls.length - 1 ? 0 : current.index + 1,
          }
        : current,
    );
  }

  function handleLightboxTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    lightboxTouchStartXRef.current = event.touches[0]?.clientX ?? null;
  }

  function handleLightboxTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (lightboxTouchStartXRef.current === null || !lightboxState || lightboxState.imageUrls.length < 2) {
      lightboxTouchStartXRef.current = null;
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? lightboxTouchStartXRef.current;
    const deltaX = endX - lightboxTouchStartXRef.current;
    lightboxTouchStartXRef.current = null;

    if (Math.abs(deltaX) < 36) {
      return;
    }

    if (deltaX > 0) {
      showPreviousLightboxImage();
      return;
    }

    showNextLightboxImage();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextBody = body.trim();
    const nextDriveLink = driveLink.trim();

    if (!nextTitle || !nextDriveLink) {
      return;
    }

    setIsSaving(true);

    try {
      const existingPost = editingId ? posts.find((item) => item.id === editingId) ?? null : null;
      const response = await fetch(editingId ? `/api/gallery/${editingId}` : "/api/gallery", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: nextTitle,
          body: nextBody,
          driveLink: nextDriveLink,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save gallery post.");
      }

      const nextPost = {
        id: payload.post.id,
        title: payload.post.title,
        body: payload.post.body ?? null,
        driveLink: payload.post.drive_link,
        embedUrl: payload.post.embed_url,
        images: existingPost && existingPost.driveLink === payload.post.drive_link ? existingPost.images : [],
        createdAt: payload.post.created_at ?? null,
      };

      if (editingId) {
        setPosts((current) => current.map((item) => (item.id === editingId ? nextPost : item)));
        resetInlineEdit();
      } else {
        setPosts((current) => [nextPost, ...current]);
        resetForm();
      }

      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePost(postId: string) {
    setDeletingId(postId);

    try {
      const response = await fetch(`/api/gallery/${postId}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete gallery post.");
      }

      setPosts((current) => current.filter((item) => item.id !== postId));
      if (editingId === postId) {
        resetInlineEdit();
      }
      setOpenMenuPostId(null);
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
          className="gallery-form-surface rounded-[18px] border border-border/80 p-4 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]"
        >
          <div className="flex items-center justify-center">
            <button
              aria-label={isComposerOpen ? "Close gallery form" : "Create gallery post"}
              className="event-form-input inline-flex size-11 items-center justify-center rounded-full border border-border/80 bg-white text-foreground"
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
                  autoFocus
                  className="event-form-input ui-text min-h-12 w-full rounded-[16px] border border-input bg-white px-4 py-3 pr-16 text-foreground"
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
                  className="event-form-input ui-text min-h-[44px] w-full resize-none rounded-[16px] border border-input bg-white px-4 py-3 pb-8 text-foreground"
                  maxLength={CONTENT_LIMIT}
                  onChange={(event) => {
                    resizeTextarea(event.currentTarget);
                    setBody(event.target.value);
                  }}
                  ref={(node) => resizeTextarea(node)}
                  rows={1}
                  placeholder="Description"
                  value={body}
                />
                <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
                  {body.length}/{CONTENT_LIMIT}
                </span>
              </div>

              <input
                className="event-form-input ui-text min-h-12 w-full rounded-[16px] border border-input bg-white px-4 py-3 text-foreground"
                onChange={(event) => setDriveLink(event.target.value)}
                placeholder="Google Drive folder link"
                type="url"
                value={driveLink}
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  className="event-form-input inline-flex min-h-12 w-full items-center justify-center rounded-[16px] border border-border/80 bg-white px-5 text-base font-semibold text-foreground"
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

      <div>
        {posts.length === 0 ? (
          <article className="gallery-card-surface rounded-[18px] border border-border/80 px-4 py-4 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
            <p className="ui-text m-0 text-center text-muted-foreground">No gallery posts yet</p>
          </article>
        ) : (
          posts.map((item) => (
            <article className="relative py-5" key={item.id}>
              {canCompose && editingId !== item.id ? (
                <div ref={openMenuPostId === item.id ? menuAreaRef : null} className="absolute right-0 top-5 z-20">
                  <div className="relative">
                    <button
                      aria-label="Gallery post actions"
                      className="inline-flex size-10 items-center justify-center bg-transparent text-foreground"
                      onClick={() => setOpenMenuPostId((current) => (current === item.id ? null : item.id))}
                      type="button"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {openMenuPostId === item.id ? (
                      <div
                        className="menu-surface absolute right-0 top-[calc(100%+0.25rem)] z-30 min-w-[148px] overflow-hidden rounded-[14px] border border-border shadow-[0_10px_24px_rgba(68,52,35,0.08)]"
                      >
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
                          onClick={() => void deletePost(item.id)}
                          type="button"
                        >
                          {deletingId === item.id ? <LoaderCircle className="size-4 animate-spin" /> : "Delete"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="pr-10">
                {editingId === item.id ? (
                  <form className="grid gap-3" onSubmit={handleSubmit}>
                    <div className="relative">
                      <input
                        className="event-form-input ui-text min-h-12 w-full rounded-[16px] border border-input bg-white px-4 py-3 pr-16 text-foreground"
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
                        className="event-form-input ui-text min-h-[44px] w-full resize-none rounded-[16px] border border-input bg-white px-4 py-3 pb-8 text-foreground"
                        maxLength={CONTENT_LIMIT}
                        onChange={(event) => {
                          resizeTextarea(event.currentTarget);
                          setBody(event.target.value);
                        }}
                        ref={(node) => resizeTextarea(node)}
                        rows={1}
                        placeholder="Description"
                        value={body}
                      />
                      <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
                        {body.length}/{CONTENT_LIMIT}
                      </span>
                    </div>

                    <input
                      className="event-form-input ui-text min-h-12 w-full rounded-[16px] border border-input bg-white px-4 py-3 text-foreground"
                      onChange={(event) => setDriveLink(event.target.value)}
                      placeholder="Google Drive folder link"
                      type="url"
                      value={driveLink}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        className="event-form-input inline-flex min-h-12 w-full items-center justify-center rounded-[16px] border border-border/80 bg-white px-5 text-base font-semibold text-foreground"
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
                    <button
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pr-1 text-left"
                      onClick={() => togglePostExpansion(item.id)}
                      type="button"
                    >
                      <p className="ui-text m-0 min-w-0 flex-1 text-base font-semibold leading-tight text-foreground">
                        {item.title}
                      </p>
                      {expandedPostIds.includes(item.id) ? (
                        <ChevronUp className="size-4 shrink-0 text-foreground" />
                      ) : (
                        <ChevronDown className="size-4 shrink-0 text-foreground" />
                      )}
                    </button>
                    {item.body ? <p className="ui-text mt-3 mb-0 whitespace-pre-wrap text-muted-foreground">{item.body}</p> : null}
                    <div className="mt-4 border-b border-border/70" />
                  </>
                )}
              </div>

              {editingId !== item.id ? (
                <GalleryImageStrip
                  isOpen={expandedPostIds.includes(item.id)}
                  onOpenLightbox={openLightbox}
                  post={item}
                />
              ) : null}
              {editingId !== item.id && expandedPostIds.includes(item.id) ? <div className="mt-4 border-b border-border/70" /> : null}
            </article>
          ))
        )}
      </div>
      {isClient && lightboxState
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] bg-black"
              onClick={() => setLightboxState(null)}
            >
              <div className="absolute right-3 top-3 z-20">
                <button
                  aria-label="Close image viewer"
                  className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white"
                  onClick={() => setLightboxState(null)}
                  type="button"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div
                className="relative flex h-screen w-screen items-center justify-center px-0 py-16"
                onClick={(event) => event.stopPropagation()}
                onTouchEnd={handleLightboxTouchEnd}
                onTouchStart={handleLightboxTouchStart}
              >
                {lightboxState.imageUrls.length > 1 ? (
                  <button
                    aria-label="Previous image"
                    className="absolute left-1 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"
                    onClick={showPreviousLightboxImage}
                    type="button"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                ) : null}
                <div className="flex h-full w-full items-center justify-center">
                  <img
                    alt={`Expanded gallery image ${lightboxState.index + 1}`}
                    className="pointer-events-none block max-h-full max-w-full select-none object-contain object-center"
                    draggable={false}
                    onContextMenu={preventImageSaveActions}
                    src={lightboxState.imageUrls[lightboxState.index]}
                  />
                </div>
                {lightboxState.imageUrls.length > 1 ? (
                  <button
                    aria-label="Next image"
                    className="absolute right-1 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"
                    onClick={showNextLightboxImage}
                    type="button"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                ) : null}
                {lightboxState.imageUrls.length > 1 ? (
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">
                    {lightboxState.index + 1}/{lightboxState.imageUrls.length}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
