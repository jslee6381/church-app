"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

type PrayerFeedItem = {
  id: string;
  body: string;
  followUp?: string;
  followUps?: {
    id: string;
    authorName: string;
    message: string;
    createdAtLabel: string;
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
  const [requestText, setRequestText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feed, setFeed] = useState(initialFeed);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
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
      setShowSuccess(true);
      if (payload.prayerRequest) {
        setFeed((current) => [payload.prayerRequest, ...current]);
      }
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
    setEditingText(item.body);
    setErrorMessage("");
    setShowSuccess(false);
    setOpenMenuPrayerId(null);
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update prayer request.");
    } finally {
      setIsSavingEdit(false);
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete prayer request.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="shell flex min-h-screen max-w-[560px] flex-col pb-40 pt-6">
      <header className="mb-6 space-y-4">
        <Link className="inline-flex items-center gap-2 text-base font-semibold text-foreground" href="/home">
          <ArrowLeft className="size-4" />
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
        {feed.map((item) => (
          <article
            key={item.id}
            className="rounded-[18px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] p-5 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div />
              {item.isOwner && getStatusLabel(item.status) ? (
                <span className="rounded-full border border-border/70 bg-white/88 px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {getStatusLabel(item.status)}
                </span>
              ) : null}
            </div>
            {editingId === item.id ? (
              <div className="space-y-3">
                <div ref={openMenuPrayerId === item.id ? menuAreaRef : null} className="relative">
                  <textarea
                    className="min-h-[110px] w-full resize-none rounded-[16px] border border-input bg-white px-4 py-3 pb-8 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
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
                    className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-border/70 bg-white px-4 text-sm font-semibold text-foreground"
                    onClick={() => setEditingId(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="ui-text m-0 text-muted-foreground">{item.body}</p>
            )}
            {item.followUp ? (
              <div className="mt-4 rounded-[14px] border border-border/70 bg-white/75 px-4 py-3">
                <p className="m-0 text-sm font-semibold uppercase tracking-[0.08em] text-primary">Follow-up</p>
                <p className="ui-text m-0 mt-1 text-muted-foreground">{item.followUp}</p>
              </div>
            ) : null}
            {item.followUps && item.followUps.length > 0 ? (
              <div className="mt-4 space-y-3">
                {item.followUps.map((followUp) => (
                  <div key={followUp.id} className="rounded-[14px] border border-border/70 bg-white/75 px-4 py-3">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="m-0 text-sm font-semibold text-foreground">{followUp.authorName}</p>
                      <p className="ui-text m-0 font-medium text-muted-foreground">{followUp.createdAtLabel}</p>
                    </div>
                    <p className="ui-text m-0 text-muted-foreground">{followUp.message}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {canManageItem(item) && editingId !== item.id ? (
              <div className="relative mt-4 flex justify-end">
                <div className="relative">
                  <button
                    aria-label="Prayer actions"
                    className="inline-flex size-10 items-center justify-center rounded-[14px] border border-border/70 bg-white text-foreground"
                    onClick={() =>
                      setOpenMenuPrayerId((current) => (current === item.id ? null : item.id))
                    }
                    type="button"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                  {openMenuPrayerId === item.id ? (
                    <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[132px] overflow-hidden rounded-[14px] border border-border/80 bg-white shadow-[0_10px_30px_rgba(68,52,35,0.12)]">
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
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-[linear-gradient(180deg,rgba(246,241,232,0.56)_0%,rgba(246,241,232,0.92)_18%,rgba(246,241,232,1)_100%)] px-3 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 backdrop-blur-2xl">
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

          <form className="rounded-[20px] border border-border/80 bg-white/94 p-2.5 shadow-[0_-10px_28px_rgba(68,52,35,0.08)]" onSubmit={handleSubmit}>
            {composerEnabled ? (
              <>
                <div className="flex items-end gap-3">
                  <div className="relative flex-1">
                    <textarea
                      ref={textareaRef}
                      autoComplete="off"
                      className="min-h-8 h-8 w-full resize-none rounded-[16px] border border-transparent bg-secondary/42 px-4 py-[6px] pb-8 text-base leading-6 text-foreground outline-none transition focus:border-primary focus:bg-white focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                      maxLength={CONTENT_LIMIT}
                      onChange={(event) => {
                        setRequestText(event.target.value);
                        if (showSuccess) setShowSuccess(false);
                        if (errorMessage) setErrorMessage("");
                      }}
                      placeholder="Share a prayer request..."
                      rows={1}
                      value={requestText}
                    />
                    <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
                      {requestText.length}/{CONTENT_LIMIT}
                    </span>
                  </div>

                  {requestText.trim() ? (
                    <Button className="min-h-10 rounded-[16px] px-5" disabled={isSubmitting} size="sm" type="submit">
                      {isSubmitting ? <LoaderCircle className="size-5 animate-spin" /> : "Send"}
                    </Button>
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
