"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CONTENT_LIMIT = 150;
const DEFAULT_ACTIVITY_DATE = "2026-07-19";

type CommunityUpdateItem = {
  id: string;
  summary: string;
  body: string;
  imageUrl: string | null;
  imageUrls: string[];
  activityDate: string | null;
  status: "pending" | "approved" | "rejected" | "archived";
  authorName: string;
  createdAtLabel: string;
  publishedAtLabel?: string | null;
};

type Props = {
  pending: CommunityUpdateItem[];
  reviewed: CommunityUpdateItem[];
};

export function CommunityUpdatesModeration({ pending, reviewed }: Props) {
  const [pendingItems, setPendingItems] = useState(pending);
  const [reviewedItems, setReviewedItems] = useState(reviewed);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftSummary, setDraftSummary] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftImageUrl, setDraftImageUrl] = useState("");
  const [draftActivityDate, setDraftActivityDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  function loadItem(item: CommunityUpdateItem) {
    setEditingId(item.id);
    setDraftSummary(item.summary);
    setDraftBody(item.body);
    setDraftImageUrl(item.imageUrl ?? "");
    setDraftActivityDate(item.activityDate ?? DEFAULT_ACTIVITY_DATE);
    setFeedback("");
  }

  function closeEditor() {
    setEditingId(null);
    setDraftSummary("");
    setDraftBody("");
    setDraftImageUrl("");
    setDraftActivityDate("");
    setFeedback("");
  }

  async function save(
    item: CommunityUpdateItem,
    status: CommunityUpdateItem["status"],
    overrides?: {
      summary?: string;
      body?: string;
      imageUrl?: string;
      activityDate?: string | null;
    },
  ) {
    setIsSaving(true);
    setFeedback("");

    const nextSummary = overrides?.summary ?? draftSummary;
    const nextBody = overrides?.body ?? draftBody;
    const nextImageUrl = overrides?.imageUrl ?? draftImageUrl;
    const nextActivityDate = overrides?.activityDate ?? draftActivityDate;

    try {
      const response = await fetch(`/api/admin/community-updates/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: nextSummary,
          body: nextBody,
          imageUrl: nextImageUrl,
          activityDate: nextActivityDate,
          status,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update community update.");
      }

      const updated = {
        ...item,
        summary: payload.communityUpdate.summary,
        body: payload.communityUpdate.body,
        imageUrl: payload.communityUpdate.imageUrl,
        imageUrls: payload.communityUpdate.imageUrls ?? item.imageUrls,
        activityDate: payload.communityUpdate.activityDate,
        status: payload.communityUpdate.status,
        publishedAtLabel: payload.communityUpdate.publishedAtLabel,
      } satisfies CommunityUpdateItem;

      if (status === item.status) {
        setPendingItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      } else {
        setPendingItems((current) => current.filter((entry) => entry.id !== updated.id));
        setReviewedItems((current) => [updated, ...current.filter((entry) => entry.id !== updated.id)]);
      }

      closeEditor();
      setFeedback(
        status === "approved"
          ? "Community update approved."
          : status === "rejected"
            ? "Community update rejected."
            : status === "archived"
              ? "Community update archived."
              : "Changes saved.",
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update community update.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="stack">
      <Card>
        <CardHeader>
          <p className="section-kicker">Community Updates Queue</p>
          <CardTitle>Pending updates from approved members</CardTitle>
          <CardDescription>Only approved updates appear on Home and accept reactions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {feedback ? <div className="rounded-[16px] border border-border/80 bg-white/72 px-4 py-3 text-sm text-muted-foreground">{feedback}</div> : null}

          {pendingItems.length === 0 ? (
            <div className="rounded-[24px] border border-border/80 bg-white/70 p-5">
              <p className="m-0 text-lg leading-8 text-muted-foreground">No pending community updates right now.</p>
            </div>
          ) : (
            pendingItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-[24px] border p-5 transition ${
                  item.id === editingId ? "border-primary/35 bg-accent/55 shadow-sm" : "border-border/80 bg-white/70"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="m-0 text-[1rem] font-medium leading-7 text-foreground">{item.summary}</h3>
                  <span className="date-chip">{item.createdAtLabel}</span>
                </div>
                <p className="m-0 text-base leading-7 text-muted-foreground">{item.authorName}</p>
                {item.imageUrls.length > 0 ? (
                  <div className="mt-4 flex gap-2 overflow-x-auto">
                    {item.imageUrls.map((imageUrl, index) => (
                      <img
                        key={`${item.id}-preview-${index}`}
                        alt={`Community update preview ${index + 1}`}
                        className="h-28 w-28 shrink-0 rounded-[14px] border border-border/70 object-cover"
                        src={imageUrl}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-[14px] border border-border/80 bg-white px-4 text-sm font-semibold text-foreground"
                    onClick={() => loadItem(item)}
                    type="button"
                  >
                    {item.id === editingId ? "Editing" : "Edit"}
                  </button>
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-[14px] bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    disabled={isSaving}
                    onClick={() =>
                      void save(item, "approved", {
                        summary: item.summary,
                        body: item.body,
                        imageUrl: item.imageUrl ?? "",
                        activityDate: item.activityDate,
                      })
                    }
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-[14px] border border-border/80 bg-white px-4 text-sm font-semibold text-foreground"
                    disabled={isSaving}
                    onClick={() =>
                      void save(item, "rejected", {
                        summary: item.summary,
                        body: item.body,
                        imageUrl: item.imageUrl ?? "",
                        activityDate: item.activityDate,
                      })
                    }
                    type="button"
                  >
                    Reject
                  </button>
                </div>

                {item.id === editingId ? (
                  <div className="mt-4 grid gap-4 border-t border-border/80 pt-4">
                    <textarea
                      className="min-h-[90px] rounded-[16px] border border-input bg-white px-4 py-3"
                      maxLength={CONTENT_LIMIT}
                      onChange={(event) => setDraftSummary(event.target.value)}
                      value={draftSummary}
                    />
                    <p className="m-0 -mt-2 text-right text-xs text-muted-foreground">{draftSummary.length}/{CONTENT_LIMIT}</p>
                    <textarea
                      className="min-h-[140px] rounded-[16px] border border-input bg-white px-4 py-3"
                      maxLength={CONTENT_LIMIT}
                      onChange={(event) => setDraftBody(event.target.value)}
                      value={draftBody}
                    />
                    <p className="m-0 -mt-2 text-right text-xs text-muted-foreground">{draftBody.length}/{CONTENT_LIMIT}</p>
                    <input
                      className="min-h-12 rounded-[16px] border border-input bg-white px-4 py-3"
                      onChange={(event) => setDraftImageUrl(event.target.value)}
                      placeholder="Image URL"
                      value={draftImageUrl}
                    />
                    {item.imageUrls.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto">
                        {item.imageUrls.map((imageUrl, index) => (
                          <img
                            key={`${item.id}-${index}`}
                            alt={`Community update ${index + 1}`}
                            className="h-28 w-28 shrink-0 rounded-[14px] border border-border/70 object-cover"
                            src={imageUrl}
                          />
                        ))}
                      </div>
                    ) : null}
                    <input
                      className="min-h-12 rounded-[16px] border border-input bg-white px-4 py-3"
                      onChange={(event) => setDraftActivityDate(event.target.value)}
                      type="date"
                      value={draftActivityDate ?? ""}
                    />
                    <div className="grid gap-3">
                      <button
                        className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-border/80 bg-white px-4 text-base font-semibold text-foreground"
                        disabled={isSaving}
                        onClick={() => void save(item, item.status)}
                        type="button"
                      >
                        {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : "Save edits"}
                      </button>
                      <button
                        className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-primary px-4 text-base font-semibold text-primary-foreground"
                        disabled={isSaving}
                        onClick={() => void save(item, "approved")}
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-border/80 bg-white px-4 text-base font-semibold text-foreground"
                        disabled={isSaving}
                        onClick={() => void save(item, "rejected")}
                        type="button"
                      >
                        Reject
                      </button>
                      <button
                        className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-border/80 bg-white px-4 text-base font-semibold text-foreground"
                        onClick={closeEditor}
                        type="button"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="section-kicker">Reviewed Updates</p>
          <CardTitle>Recent decisions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {reviewedItems.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-border/80 bg-white/70 p-5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="m-0 text-[1rem] font-medium leading-7 text-foreground">{item.summary}</h3>
                <span className="date-chip">{item.status}</span>
              </div>
              <p className="m-0 text-base leading-7 text-muted-foreground">{item.authorName}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
