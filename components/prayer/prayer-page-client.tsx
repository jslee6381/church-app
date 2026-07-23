"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, CornerDownLeft, LoaderCircle, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type PrayerFeedItem = {
  id: string;
  body: string;
  followUp?: string;
  followUps?: {
    id: string;
    authorName: string;
    message: string;
    createdAtLabel?: string;
  }[];
  status?: "pending" | "approved" | "rejected" | "archived";
  isOwner?: boolean;
};

type PrayerPageClientProps = {
  initialFeed: PrayerFeedItem[];
  memberName?: string;
  composerEnabled?: boolean;
  lockedMessage?: string | null;
  canManageAll?: boolean;
};

const MIN_TEXTAREA_HEIGHT = 48;
const MAX_TEXTAREA_HEIGHT = 144;
const CONTENT_LIMIT = 150;

export function PrayerPageClient({
  initialFeed,
  memberName,
  composerEnabled = true,
  lockedMessage = null,
  canManageAll = false,
}: PrayerPageClientProps) {
  const router = useRouter();
  const [requestText, setRequestText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feed, setFeed] = useState(initialFeed);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [updatingPrayerId, setUpdatingPrayerId] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);
  const [expandedUpdates, setExpandedUpdates] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openMenuPrayerId, setOpenMenuPrayerId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const menuAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [requestText]);

  useEffect(() => {
    setFeed(initialFeed);
  }, [initialFeed]);

  useEffect(() => {
    if (!openMenuPrayerId) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuAreaRef.current?.contains(event.target as Node)) {
        setOpenMenuPrayerId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openMenuPrayerId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedText = requestText.trim();

    if (!trimmedText) return;

    setIsSubmitting(true);
    setShowSuccess(false);
    setErrorMessage("");

    try {
      const response = await fetch("/api/prayer-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestText: trimmedText,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to submit prayer request.");
      }

      setRequestText("");
      setIsComposerExpanded(false);
      setShowSuccess(true);
      if (payload.prayerRequest) {
        setFeed((current) => [payload.prayerRequest, ...current]);
      }
      router.refresh();
      textareaRef.current?.focus();
    } catch (error) {
      setShowSuccess(false);
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit prayer request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusLabel(status?: PrayerFeedItem["status"]) {
    switch (status) {
      case "pending":
        return "Pending review";
      case "rejected":
        return "Needs changes";
      case "archived":
        return "Archived";
      default:
        return null;
    }
  }

  function startEditing(item: PrayerFeedItem) {
    setEditingId(item.id);
    setUpdatingPrayerId(null);
    setEditingText(item.body);
    setErrorMessage("");
    setShowSuccess(false);
    setOpenMenuPrayerId(null);
  }

  function startUpdating(item: PrayerFeedItem) {
    setUpdatingPrayerId(item.id);
    setEditingId(null);
    setUpdateText("");
    setErrorMessage("");
    setShowSuccess(false);
    setOpenMenuPrayerId(null);
  }

  function getAllUpdates(item: PrayerFeedItem) {
    const updates = item.followUps ? [...item.followUps] : [];

    if (updates.length === 0 && item.followUp) {
      updates.push({
        id: `${item.id}-legacy-follow-up`,
        authorName: "Update",
        message: item.followUp,
      });
    }

    return updates;
  }

  function toggleUpdates(prayerId: string) {
    setExpandedUpdates((current) => ({
      ...current,
      [prayerId]: !current[prayerId],
    }));
  }

  function canManageItem(item: PrayerFeedItem) {
    return Boolean(item.isOwner || canManageAll);
  }

  async function saveEdit(prayerId: string) {
    setIsSavingEdit(true);
    setErrorMessage("");
    setShowSuccess(false);

    try {
      const response = await fetch(`/api/prayer-requests/${prayerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestText: editingText,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update prayer request.");
      }

      setFeed((current) =>
        current.map((item) =>
          item.id === prayerId
            ? {
                ...item,
                body: payload.prayerRequest.body,
                status: payload.prayerRequest.status,
              }
            : item,
        ),
      );
      setEditingId(null);
      setShowSuccess(true);
      setOpenMenuPrayerId(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update prayer request.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function saveUpdate(prayerId: string) {
    const trimmedText = updateText.trim();

    if (!trimmedText) {
      return;
    }

    setIsSavingUpdate(true);
    setErrorMessage("");
    setShowSuccess(false);

    try {
      const response = await fetch(`/api/prayer-requests/${prayerId}/follow-ups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedText,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add update.");
      }

      setFeed((current) =>
        current.map((item) =>
          item.id === prayerId
            ? {
                ...item,
                body: payload.prayerRequest?.body ?? trimmedText,
                status: payload.prayerRequest?.status ?? item.status,
                followUp: undefined,
                followUps: [...(item.followUps ?? []), payload.followUp],
              }
            : item,
        ),
      );
      setExpandedUpdates((current) => ({ ...current, [prayerId]: true }));
      setUpdatingPrayerId(null);
      setUpdateText("");
      setShowSuccess(true);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to add update.");
    } finally {
      setIsSavingUpdate(false);
    }
  }

  async function deletePrayer(prayerId: string) {
    setDeletingId(prayerId);
    setErrorMessage("");
    setShowSuccess(false);

    try {
      const response = await fetch(`/api/prayer-requests/${prayerId}`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete prayer request.");
      }

      setFeed((current) => current.filter((item) => item.id !== prayerId));
      setOpenMenuPrayerId(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete prayer request.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="shell flex min-h-screen max-w-[560px] flex-col pb-40 pt-6">
      <header className="mb-6 space-y-4">
        <Link className="inline-flex min-h-11 items-center gap-2 bg-transparent px-0 text-base font-semibold text-foreground" href="/home">
          <ChevronLeft className="size-4" />
          Home
        </Link>
        <div className="space-y-1 text-center">
          <p className="ui-text m-0 text-muted-foreground">
            &ldquo;If one part suffers, every part suffers with it; if one part is honored, every part rejoices with it.&rdquo;
          </p>
          <p className="m-0 text-sm font-medium text-muted-foreground">1 Corinthians 12:26</p>
        </div>
      </header>

      <section className="flex-1 space-y-4">
        {feed.map((item, index) => (
          <article
            key={item.id}
            className={`relative py-4 ${index < feed.length - 1 ? "border-b border-border/60" : ""}`}
          >
            {editingId !== item.id && updatingPrayerId !== item.id ? (
              <div
                ref={openMenuPrayerId === item.id ? menuAreaRef : null}
                className="absolute right-0 top-2 z-10 flex items-center gap-1"
              >
                <button
                  className="inline-flex min-h-10 items-center justify-center bg-transparent px-2 text-xs font-medium text-muted-foreground"
                  onClick={() => startUpdating(item)}
                  type="button"
                >
                  Update
                </button>
                {getAllUpdates(item).length > 0 ? (
                  <button
                    aria-label={expandedUpdates[item.id] ? "Hide updates" : "Show updates"}
                    className="inline-flex size-10 items-center justify-center bg-transparent text-foreground"
                    onClick={() => toggleUpdates(item.id)}
                    type="button"
                  >
                    <CornerDownLeft className={`size-4 transition ${expandedUpdates[item.id] ? "rotate-180" : "rotate-0"}`} />
                  </button>
                ) : null}
                {canManageItem(item) ? (
                  <div className="relative">
                    <button
                      aria-label="Prayer actions"
                      className="inline-flex size-10 items-center justify-center bg-transparent text-foreground"
                      onClick={() =>
                        setOpenMenuPrayerId((current) => (current === item.id ? null : item.id))
                      }
                      type="button"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {openMenuPrayerId === item.id ? (
                      <div className="prayer-card-surface absolute right-0 top-[calc(100%+0.25rem)] z-20 min-w-[132px] overflow-hidden rounded-[14px] border border-border/80 bg-white shadow-[0_10px_30px_rgba(68,52,35,0.12)]">
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
                          onClick={() => deletePrayer(item.id)}
                          type="button"
                        >
                          {deletingId === item.id ? <LoaderCircle className="size-4 animate-spin" /> : "Delete"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            {item.isOwner && getStatusLabel(item.status) ? (
              <div className="mb-2 pr-32">
                <span className="prayer-card-surface rounded-full border border-border/70 bg-white/88 px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {getStatusLabel(item.status)}
                </span>
              </div>
            ) : null}
            {editingId === item.id ? (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    className="prayer-form-input min-h-[110px] w-full resize-none rounded-[16px] border border-input bg-white px-4 py-3 pb-8 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                    maxLength={CONTENT_LIMIT}
                    onChange={(event) => setEditingText(event.target.value)}
                    value={editingText}
                  />
                  <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
                    {editingText.length}/{CONTENT_LIMIT}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    disabled={isSavingEdit}
                    onClick={() => saveEdit(item.id)}
                    type="button"
                  >
                    {isSavingEdit ? <LoaderCircle className="size-4 animate-spin" /> : "Save"}
                  </button>
                  <button
                    className="prayer-form-input inline-flex min-h-11 items-center justify-center rounded-[14px] border border-border/70 bg-white px-4 text-sm font-semibold text-foreground"
                    onClick={() => setEditingId(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="ui-text m-0 pr-32 leading-[1.5] break-words text-foreground">{item.body}</p>
            )}
            {updatingPrayerId === item.id ? (
              <div className="mt-3 space-y-3">
                <div className="relative">
                  <textarea
                    className="prayer-form-input min-h-[110px] w-full resize-none rounded-[16px] border border-input bg-white px-4 py-3 pb-8 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                    maxLength={CONTENT_LIMIT}
                    onChange={(event) => setUpdateText(event.target.value)}
                    placeholder="Share an update..."
                    value={updateText}
                  />
                  <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
                    {updateText.length}/{CONTENT_LIMIT}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    className="min-h-11 rounded-[16px]"
                    onClick={() => {
                      setUpdatingPrayerId(null);
                      setUpdateText("");
                    }}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="min-h-11 rounded-[16px]"
                    disabled={isSavingUpdate || !updateText.trim()}
                    onClick={() => saveUpdate(item.id)}
                    size="sm"
                    type="button"
                  >
                    {isSavingUpdate ? <LoaderCircle className="size-4 animate-spin" /> : "Post"}
                  </Button>
                </div>
              </div>
            ) : null}
            {getAllUpdates(item).length > 1 && expandedUpdates[item.id] ? (
              <div className="mt-3 border-t border-border/50 pt-3 pl-4">
                <div className="space-y-3">
                  {[...getAllUpdates(item)].slice(0, -1).reverse().map((followUp, followUpIndex) => (
                    <div key={followUp.id} className={followUpIndex > 0 ? "border-t border-border/40 pt-3" : ""}>
                      <div className="relative pr-16">
                        <p className="ui-text m-0 leading-[1.5] text-foreground">{followUp.message}</p>
                        {followUp.createdAtLabel ? (
                          <p className="m-0 absolute right-0 top-0 text-[0.7rem] font-normal leading-5 text-muted-foreground">{followUp.createdAtLabel}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <div className="prayer-composer-shell fixed inset-x-0 bottom-0 z-30 bg-[linear-gradient(180deg,rgba(246,241,232,0.56)_0%,rgba(246,241,232,0.92)_18%,rgba(246,241,232,1)_100%)] px-3 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 backdrop-blur-2xl">
        <div className="mx-auto w-full max-w-[560px]">
          {showSuccess ? (
            <div className="mb-3 rounded-[18px] border border-accent bg-accent/70 px-4 py-3 text-base leading-7 text-accent-foreground shadow-sm">
              <p className="m-0 font-semibold">Thank you.</p>
              <p className="m-0">Your prayer request has been submitted.</p>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-3 rounded-[18px] border border-destructive/25 bg-destructive/10 px-4 py-3 text-base leading-7 text-destructive shadow-sm">
              <p className="m-0 font-semibold">Something went wrong.</p>
              <p className="m-0">{errorMessage}</p>
            </div>
          ) : null}

          <form className="p-0" onSubmit={handleSubmit}>
            {composerEnabled ? (
              <>
                <div className="grid gap-3">
                  <div className="relative flex-1">
                    <textarea
                      ref={textareaRef}
                      autoComplete="off"
                      className={`prayer-form-input w-full resize-none rounded-[16px] border border-transparent bg-white px-4 text-base leading-6 text-foreground outline-none transition focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)] ${
                        isComposerExpanded ? "min-h-[110px] py-3 pb-8" : "h-10 min-h-10 py-2"
                      }`}
                      maxLength={CONTENT_LIMIT}
                      onChange={(event) => {
                        setRequestText(event.target.value);
                        if (showSuccess) setShowSuccess(false);
                        if (errorMessage) setErrorMessage("");
                      }}
                      onFocus={() => setIsComposerExpanded(true)}
                      placeholder="Share a prayer request..."
                      rows={1}
                      value={requestText}
                    />
                    <span
                      className={`pointer-events-none absolute right-4 text-xs text-muted-foreground ${
                        isComposerExpanded ? "bottom-3" : "top-1/2 -translate-y-1/2"
                      }`}
                    >
                      {requestText.length}/{CONTENT_LIMIT}
                    </span>
                  </div>

                  {isComposerExpanded ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        className="min-h-11 rounded-[16px]"
                        onClick={() => {
                          setIsComposerExpanded(false);
                          setRequestText("");
                          setErrorMessage("");
                          setShowSuccess(false);
                        }}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        Cancel
                      </Button>
                      <Button
                        className="min-h-11 rounded-[16px]"
                        disabled={isSubmitting || !requestText.trim()}
                        size="sm"
                        type="submit"
                      >
                        {isSubmitting ? <LoaderCircle className="size-5 animate-spin" /> : "Post"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="rounded-[18px] bg-secondary/42 px-4 py-3 text-sm leading-6 text-muted-foreground">
                {lockedMessage ?? "Sign in and wait for approval to share a prayer request."}
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
