"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MoreVertical, Plus } from "lucide-react";

type GalleryPostItem = {
  id: string;
  title: string;
  body: string | null;
  driveLink: string;
  embedUrl: string;
  createdAt: string | null;
};

type Props = {
  initialPosts: GalleryPostItem[];
  canCompose: boolean;
};

const TITLE_LIMIT = 50;
const CONTENT_LIMIT = 150;
const MIN_TEXTAREA_HEIGHT = 44;
const MAX_TEXTAREA_HEIGHT = 160;

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;

  textarea.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
  textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
}

export function GalleryPageClient({ initialPosts, canCompose }: Props) {
  const router = useRouter();
  const composerRef = useRef<HTMLDivElement | null>(null);
  const menuAreaRef = useRef<HTMLDivElement | null>(null);
  const [posts, setPosts] = useState(initialPosts);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

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
          className="study-video-surface sticky top-4 z-10 rounded-[18px] border border-border/80 bg-card p-4 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]"
        >
          <div className="flex items-center justify-center">
            <button
              aria-label={isComposerOpen ? "Close gallery form" : "Create gallery post"}
              className="inline-flex size-11 items-center justify-center rounded-full border border-border/80 bg-background text-foreground"
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
                  className="ui-text min-h-12 w-full rounded-[16px] border border-input bg-background px-4 py-3 pr-16 text-foreground"
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
                  className="ui-text min-h-[44px] w-full resize-none rounded-[16px] border border-input bg-background px-4 py-3 pb-8 text-foreground"
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
                className="ui-text min-h-12 w-full rounded-[16px] border border-input bg-background px-4 py-3 text-foreground"
                onChange={(event) => setDriveLink(event.target.value)}
                placeholder="Google Drive folder link"
                type="url"
                value={driveLink}
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-[16px] border border-border/80 bg-background px-5 text-base font-semibold text-foreground"
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
        {posts.length === 0 ? (
          <article className="study-video-surface rounded-[18px] border border-border/80 bg-card px-4 py-4 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
            <p className="ui-text m-0 text-center text-muted-foreground">No gallery posts yet</p>
          </article>
        ) : (
          posts.map((item) => (
            <article
              className="study-video-surface relative overflow-hidden rounded-[18px] border border-border/80 bg-card shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]"
              key={item.id}
            >
              {canCompose && editingId !== item.id ? (
                <div ref={openMenuPostId === item.id ? menuAreaRef : null} className="absolute right-3 top-3 z-20">
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
                      <div className="absolute right-0 top-[calc(100%+0.25rem)] z-30 min-w-[148px] overflow-hidden rounded-[14px] border border-border bg-background">
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

              <div className="p-4">
                {editingId === item.id ? (
                  <form className="grid gap-3" onSubmit={handleSubmit}>
                    <div className="relative">
                      <input
                        className="ui-text min-h-12 w-full rounded-[16px] border border-input bg-background px-4 py-3 pr-16 text-foreground"
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
                        className="ui-text min-h-[44px] w-full resize-none rounded-[16px] border border-input bg-background px-4 py-3 pb-8 text-foreground"
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
                      className="ui-text min-h-12 w-full rounded-[16px] border border-input bg-background px-4 py-3 text-foreground"
                      onChange={(event) => setDriveLink(event.target.value)}
                      placeholder="Google Drive folder link"
                      type="url"
                      value={driveLink}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-[16px] border border-border/80 bg-background px-5 text-base font-semibold text-foreground"
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
                    {item.body ? <p className="ui-text mt-3 mb-0 whitespace-pre-wrap text-muted-foreground">{item.body}</p> : null}
                  </>
                )}
              </div>

              {editingId !== item.id ? (
                <div className="border-t border-border/70">
                  <iframe
                    allow="fullscreen"
                    className="block h-[420px] w-full border-0 bg-background"
                    loading="lazy"
                    src={item.embedUrl}
                    title={item.title}
                  />
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
