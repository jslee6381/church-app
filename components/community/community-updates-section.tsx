"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, MoreVertical, SendHorizonal, Users } from "lucide-react";
import type { CommunityUpdateFeedItem, ReactionKind } from "@/lib/community-updates";

const CONTENT_LIMIT = 150;
const MAX_IMAGES = 5;

type Props = {
  canManage: boolean;
  initialUpdates: CommunityUpdateFeedItem[];
  canReact: boolean;
  currentMemberPhotoUrl?: string | null;
  submitAccessState: "signed_out" | "pending" | "active";
};

function HeartReactionIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" className="h-[1.7rem] w-[1.7rem]" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24">
      <path
        d="M12 20.5 4.9 13.9a4.8 4.8 0 0 1 6.8-6.8L12 7.4l.3-.3a4.8 4.8 0 1 1 6.8 6.8L12 20.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function LikeReactionIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" className="h-[1.7rem] w-[1.7rem]" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24">
      <path
        d="M9.5 21H6a2 2 0 0 1-2-2v-7.5a2 2 0 0 1 2-2h3.5V21Zm0-11.5 3-6A1.8 1.8 0 0 1 14.2 2c1 0 1.8.8 1.8 1.8V7h3.5a2.5 2.5 0 0 1 2.4 3.1l-1.5 7A2.5 2.5 0 0 1 18 19H9.5V9.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function CommunityUpdatesSection({
  canManage,
  initialUpdates,
  canReact,
  currentMemberPhotoUrl = null,
  submitAccessState,
}: Props) {
  const composerRef = useRef<HTMLFormElement | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const [updates, setUpdates] = useState(initialUpdates);
  const [selectedReactions, setSelectedReactions] = useState<Record<string, ReactionKind>>(
    Object.fromEntries(
      initialUpdates
        .filter((item) => item.selectedReaction)
        .map((item) => [item.id, item.selectedReaction as ReactionKind]),
    ),
  );
  const [summary, setSummary] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [savingReactionId, setSavingReactionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSummary, setEditingSummary] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSubmitGate, setShowSubmitGate] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [openMenuUpdateId, setOpenMenuUpdateId] = useState<string | null>(null);

  function getUpdateContent(update: CommunityUpdateFeedItem) {
    return update.body?.trim() || update.summary || update.legacyTitle || "";
  }

  function keepComposerVisible() {
    if (typeof window === "undefined") {
      return;
    }

    const scrollComposerIntoView = () => {
      composerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      submitButtonRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    };

    window.requestAnimationFrame(scrollComposerIntoView);
    window.setTimeout(scrollComposerIntoView, 220);
    window.setTimeout(scrollComposerIntoView, 420);
  }

  useEffect(() => {
    if (!isComposerExpanded) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
      keepComposerVisible();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isComposerExpanded]);

  function openComposer() {
    setIsComposerExpanded(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitAccessState === "signed_out") {
      router.push("/access-required?context=community-feed&next=%2Fhome");
      return;
    }

    if (submitAccessState !== "active") {
      setShowSubmitGate(true);
      setFeedback("");
      return;
    }

    setIsSubmitting(true);
    setFeedback("");
    setShowSubmitGate(false);

    try {
      const formData = new FormData();
      formData.set("summary", summary);

      imageFiles.forEach((file) => formData.append("images", file));

      const response = await fetch("/api/community-updates", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to submit community update.");
      }

      setSummary("");
      setImageFiles([]);
      setIsComposerExpanded(false);
      setFeedback(payload.message ?? "Your community update was published.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to submit community update.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleReaction(updateId: string, reactionKind: ReactionKind) {
    if (!canReact) {
      return;
    }

    setSavingReactionId(updateId);
    setFeedback("");

    const currentKind = selectedReactions[updateId];
    const willRemove = currentKind === reactionKind;

    try {
      const response = await fetch(`/api/community-updates/${updateId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reactionKind }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update reaction.");
      }

      setUpdates((current) =>
        current.map((item) =>
          item.id === updateId
            ? {
                ...item,
                reactionCounts: payload.reactionCounts,
                selectedReaction: payload.selectedReaction,
              }
            : item,
        ),
      );
      if (!payload.reacted || willRemove || !payload.selectedReaction) {
        setSelectedReactions((current) => {
          const next = { ...current };
          delete next[updateId];
          return next;
        });
      } else {
        setSelectedReactions((current) => ({
          ...current,
          [updateId]: payload.selectedReaction,
        }));
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update reaction.");
    } finally {
      setSavingReactionId(null);
    }
  }

  function startEditing(update: CommunityUpdateFeedItem) {
    setEditingId(update.id);
    setEditingSummary(getUpdateContent(update));
    setFeedback("");
    setOpenMenuUpdateId(null);
  }

  async function saveEdit(updateId: string) {
    setIsSavingEdit(true);
    setFeedback("");

    try {
      const response = await fetch(`/api/community-updates/${updateId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: editingSummary,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update community update.");
      }

      setUpdates((current) =>
        current.map((item) =>
          item.id === updateId
            ? {
                ...item,
                summary: payload.update.summary,
                body: payload.update.body,
                status: payload.update.status,
              }
            : item,
        ),
      );
      setEditingId(null);
      setFeedback(payload.message ?? "Your update was published.");
      setOpenMenuUpdateId(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update community update.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function deleteUpdate(updateId: string) {
    setDeletingId(updateId);
    setFeedback("");

    try {
      const response = await fetch(`/api/community-updates/${updateId}`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete community update.");
      }

      setUpdates((current) => current.filter((item) => item.id !== updateId));
      if (editingId === updateId) {
        setEditingId(null);
      }
      setFeedback(payload.message ?? "Community update deleted.");
      setOpenMenuUpdateId(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to delete community update.");
    } finally {
      setDeletingId(null);
    }
  }

  function getStatusLabel(status: CommunityUpdateFeedItem["status"]) {
    switch (status) {
      case "rejected":
        return "Needs changes";
      case "archived":
        return "Archived";
      default:
        return null;
    }
  }

  const reactionKinds: ReactionKind[] = ["heart", "like"];

  function renderReactionIcon(kind: ReactionKind, active: boolean) {
    switch (kind) {
      case "heart":
        return <HeartReactionIcon active={active} />;
      case "like":
        return <LikeReactionIcon active={active} />;
      default:
        return null;
    }
  }

  function getReactionClassName(kind: ReactionKind, active: boolean) {
    if (!active) {
      return "text-muted-foreground";
    }

    switch (kind) {
      case "heart":
        return "text-red-500";
      case "like":
        return "text-blue-500";
      default:
        return "text-primary";
    }
  }

  return (
    <div className="overflow-hidden rounded-[16px] bg-transparent shadow-none">
      <div className="mb-3 px-4 pt-1 pb-2">
        <form className="scroll-mb-40" onSubmit={handleSubmit} ref={composerRef}>
          <div className="grid gap-3">
            <div className={`flex gap-3 ${isComposerExpanded ? "items-start" : "items-center"}`}>
              {!isComposerExpanded ? (
                currentMemberPhotoUrl ? (
                  <img alt="Your profile" className="shrink-0 self-center size-10 rounded-full object-cover" src={currentMemberPhotoUrl} />
                ) : (
                  <div className="inline-flex shrink-0 self-center size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Users className="size-5" />
                  </div>
                )
              ) : null}
              <div
                className={`relative min-w-0 flex-1 rounded-[16px] border border-input bg-white ${
                  isComposerExpanded ? "px-3 py-2" : "px-3 py-0"
                }`}
              >
                <textarea
                  ref={composerTextareaRef}
                  className={`w-full resize-none rounded-[16px] border-0 bg-transparent outline-none focus:border-0 focus:shadow-none ${
                    isComposerExpanded ? "min-h-[110px] px-0 py-1 pb-8" : "h-8 min-h-8 py-[6px] pr-10 pl-0"
                  }`}
                  maxLength={CONTENT_LIMIT}
                  onChange={(event) => setSummary(event.target.value)}
                  onFocus={() => {
                    openComposer();
                    keepComposerVisible();
                  }}
                  placeholder="Share an update..."
                  rows={1}
                  value={summary}
                />
                {isComposerExpanded ? (
                  <span className="pointer-events-none absolute bottom-3 right-0 text-xs text-muted-foreground">
                    {summary.length}/{CONTENT_LIMIT}
                  </span>
                ) : (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <SendHorizonal className="size-4" />
                  </span>
                )}
              </div>
            </div>

            {isComposerExpanded ? (
              <>
              <label className="grid gap-2 text-sm font-medium text-muted-foreground">
                Photos optional, JPG/PNG/WEBP up to 8 MB each
                <input
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)] file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-accent-foreground"
                  onChange={(event) => setImageFiles(Array.from(event.target.files ?? []).slice(0, MAX_IMAGES))}
                  onFocus={keepComposerVisible}
                  type="file"
                />
              </label>
              {imageFiles.length > 0 ? (
                <div className="grid gap-2">
                  <p className="m-0 text-sm text-muted-foreground">{imageFiles.length}/{MAX_IMAGES} selected</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {imageFiles.map((file) => (
                      <div
                        key={`${file.name}-${file.size}`}
                        className="shrink-0 rounded-[14px] border border-border/70 bg-white px-3 py-2 text-sm text-muted-foreground"
                      >
                        {file.name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <button
                className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-60"
                disabled={isSubmitting}
                ref={submitButtonRef}
                type="submit"
              >
                {isSubmitting ? <LoaderCircle className="size-5 animate-spin" /> : "Post"}
              </button>
              </>
            ) : null}
          </div>
        </form>

        {showSubmitGate && submitAccessState === "pending" ? (
          <div className="mt-4 rounded-[18px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] p-5 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-primary">Awaiting Approval</p>
            <h3 className="mb-3 mt-3 font-sans text-[1.35rem] leading-tight text-foreground">
              You are signed in. A church admin still needs to approve your member access.
            </h3>
            <p className="ui-text m-0 text-muted-foreground">
              Once approved, you will be able to post updates and photos to the community feed.
            </p>
            <div className="mt-5">
              <Link
                className="inline-flex min-h-11 items-center rounded-[16px] border border-border/80 bg-white/80 px-4 text-sm font-semibold text-foreground transition hover:bg-white"
                href="/settings"
              >
                Open Settings
              </Link>
            </div>
          </div>
        ) : null}

        {feedback ? <p className="mt-3 m-0 text-sm text-muted-foreground">{feedback}</p> : null}
      </div>

      <div className="pb-4">
        {updates.map((update, index) => (
          <article
            key={update.id}
            className={`overflow-hidden pb-2 last:pb-0 ${index > 0 ? "border-t border-border/70 pt-2" : ""}`}
          >
            <div className="px-4 pt-1 pb-2">
              <div className="flex min-h-[36px] items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {update.authorPhotoUrl ? (
                    <img
                      alt={`${update.authorName} profile`}
                      className="size-9 rounded-full object-cover"
                      src={update.authorPhotoUrl}
                    />
                  ) : (
                    <div className="inline-flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <Users className="size-4" />
                    </div>
                  )}
                  <p className="m-0 text-sm font-semibold text-foreground">{update.authorName}</p>
                </div>
                <p className="m-0 text-sm text-muted-foreground">{update.dateLabel}</p>
              </div>
            </div>
            {update.imageUrls.length > 0 ? (
              <div>
                <div className="flex snap-x snap-mandatory overflow-x-auto">
                  {update.imageUrls.map((imageUrl, index) => (
                    <img
                      key={`${update.id}-${index}`}
                      alt={`Community update image ${index + 1}`}
                      className="block w-full shrink-0 snap-center"
                      src={imageUrl}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <div className="px-4 pt-3">
              {editingId === update.id ? (
                <div className="grid gap-3">
                  <div className="relative">
                    <textarea
                      className="min-h-[110px] w-full rounded-[16px] border border-input bg-white px-4 py-3 pb-8 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                      maxLength={CONTENT_LIMIT}
                      onChange={(event) => setEditingSummary(event.target.value)}
                      value={editingSummary}
                    />
                    <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
                      {editingSummary.length}/{CONTENT_LIMIT}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-[14px] border border-border/70 bg-white px-4 text-sm font-semibold text-foreground"
                      onClick={() => setEditingId(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                      disabled={isSavingEdit}
                      onClick={() => saveEdit(update.id)}
                      type="button"
                    >
                      {isSavingEdit ? <LoaderCircle className="size-4 animate-spin" /> : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="ui-text m-0 text-foreground">{getUpdateContent(update)}</p>
                </>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-2">
                {update.status === "approved" ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {reactionKinds.map((kind) => {
                        const active = selectedReactions[update.id] === kind;
                        const count = update.reactionCounts[kind];

                        return (
                          <button
                            key={`${update.id}-${kind}`}
                            aria-label={kind}
                            className={`inline-flex items-center gap-1 rounded-full px-1 py-1 ${getReactionClassName(
                              kind,
                              active,
                            )}`}
                            disabled={!canReact || savingReactionId === update.id}
                            onClick={() => toggleReaction(update.id, kind)}
                            type="button"
                          >
                            {savingReactionId === update.id && selectedReactions[update.id] === kind ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              renderReactionIcon(kind, active)
                            )}
                            <span className="text-[1rem] font-semibold">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {editingId !== update.id && (update.isOwner || canManage) && getStatusLabel(update.status) ? (
                  <span className="rounded-full border border-border/70 bg-white/88 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {getStatusLabel(update.status)}
                  </span>
                ) : null}
              </div>
              <div className="relative flex items-center gap-2">
                {(update.isOwner || canManage) && editingId !== update.id ? (
                  <div className="relative">
                    {openMenuUpdateId === update.id ? (
                      <div className="absolute right-[calc(100%+0.5rem)] top-1/2 z-20 flex -translate-y-1/2 items-center gap-2">
                        <button
                          className="inline-flex min-h-10 items-center justify-center rounded-[14px] border border-border/80 bg-white px-4 text-sm font-semibold text-foreground"
                          onClick={() => startEditing(update)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="inline-flex min-h-10 items-center justify-center rounded-[14px] border border-border/80 bg-white px-4 text-sm font-semibold text-foreground disabled:opacity-60"
                          disabled={deletingId === update.id}
                          onClick={() => deleteUpdate(update.id)}
                          type="button"
                        >
                          {deletingId === update.id ? <LoaderCircle className="size-4 animate-spin" /> : "Delete"}
                        </button>
                      </div>
                    ) : null}
                    <button
                      aria-label="Update actions"
                      className="inline-flex size-10 items-center justify-center bg-transparent text-foreground"
                      onClick={() =>
                        setOpenMenuUpdateId((current) => (current === update.id ? null : update.id))
                      }
                      type="button"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
