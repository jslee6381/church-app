"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CONTENT_LIMIT = 150;

type PrayerQueueItem = {
  id: string;
  requestText: string;
  status: "pending" | "approved" | "rejected" | "archived";
  visibility: "public" | "small_group" | "leaders_only";
  requesterName: string;
  createdAtLabel: string;
  publishedAtLabel?: string | null;
  followUps: {
    id: string;
    authorName: string;
    message: string;
    createdAtLabel: string;
  }[];
};

type Props = {
  pending: PrayerQueueItem[];
  reviewed: PrayerQueueItem[];
};

type FeedbackState = {
  type: "success" | "error";
  message: string;
};

export function PrayerModerationDashboard({ pending, reviewed }: Props) {
  const [pendingItems, setPendingItems] = useState(pending);
  const [reviewedItems, setReviewedItems] = useState(reviewed);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftRequestText, setDraftRequestText] = useState("");
  const [draftVisibility, setDraftVisibility] = useState<PrayerQueueItem["visibility"]>(
    "public",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  function loadItem(item: PrayerQueueItem) {
    setEditingId(item.id);
    setDraftRequestText(item.requestText);
    setDraftVisibility(item.visibility);
    setFeedback(null);
  }

  function closeEditor() {
    setEditingId(null);
    setDraftRequestText("");
    setDraftVisibility("public");
    setFeedback(null);
  }

  async function updatePrayerStatus(nextStatus: "approved" | "rejected" | "archived") {
    const targetItem = pendingItems.find((item) => item.id === editingId);
    if (!targetItem) return;

    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/prayer-requests/${targetItem.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestText: draftRequestText,
          visibility: draftVisibility,
          status: nextStatus,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update prayer request.");
      }

      const updatedItem: PrayerQueueItem = payload.prayerRequest;

      setPendingItems((current) => current.filter((item) => item.id !== updatedItem.id));
      setReviewedItems((current) => [updatedItem, ...current.filter((item) => item.id !== updatedItem.id)]);
      closeEditor();
      setFeedback({
        type: "success",
        message:
          nextStatus === "approved"
            ? "Prayer request approved and published."
            : nextStatus === "rejected"
              ? "Prayer request rejected."
              : "Prayer request archived.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to update prayer request.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function saveDraft(itemId: string) {
    const item = pendingItems.find((entry) => entry.id === itemId);
    if (!item) return;

    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/prayer-requests/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestText: draftRequestText,
          visibility: draftVisibility,
          status: item.status,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save changes.");
      }

      const updatedItem: PrayerQueueItem = payload.prayerRequest;
      setPendingItems((current) => current.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      setReviewedItems((current) => current.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      closeEditor();
      setFeedback({
        type: "success",
        message: "Changes saved.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to save changes.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="stack">
      <Card>
        <CardHeader>
          <p className="section-kicker">Pending Queue</p>
          <CardTitle>Prayer requests waiting for review</CardTitle>
          <CardDescription>No request appears in the public feed until it has been approved.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {pendingItems.length === 0 ? (
            <div className="rounded-[24px] border border-border/80 bg-white/70 p-5">
              <p className="m-0 text-lg leading-8 text-muted-foreground">There are no prayer requests waiting right now.</p>
            </div>
          ) : (
            pendingItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-[24px] border p-5 transition ${
                  item.id === editingId
                    ? "border-primary/35 bg-accent/55 shadow-sm"
                    : "border-border/80 bg-white/70"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                  <h3 className="m-0 text-[1rem] font-medium leading-7 text-foreground">{item.requestText}</h3>
                  <span className="date-chip">{item.createdAtLabel}</span>
                </div>
                <p className="mb-0 text-base leading-7 text-muted-foreground">{item.requesterName}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button disabled={isSaving} onClick={() => loadItem(item)} size="sm" variant="secondary">
                    {item.id === editingId ? "Editing" : "Edit"}
                  </Button>
                  <Button
                    disabled={isSaving}
                    onClick={() => {
                      loadItem(item);
                      setTimeout(() => void updatePrayerStatus("approved"), 0);
                    }}
                    size="sm"
                  >
                    Approve
                  </Button>
                  <Button
                    disabled={isSaving}
                    onClick={() => {
                      loadItem(item);
                      setTimeout(() => void updatePrayerStatus("rejected"), 0);
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    Reject
                  </Button>
                </div>

                {item.id === editingId ? (
                  <div className="mt-4 grid gap-4 border-t border-border/80 pt-4">
                    <label className="grid gap-2 text-base font-semibold text-foreground">
                      Visibility
                      <select
                        className="min-h-12 rounded-[18px] border border-input bg-white px-4 py-3 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                        onChange={(event) => setDraftVisibility(event.target.value as PrayerQueueItem["visibility"])}
                        value={draftVisibility}
                      >
                        <option value="public">Public</option>
                        <option value="small_group">Small group</option>
                        <option value="leaders_only">Leaders only</option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-base font-semibold text-foreground">
                      Prayer request
                      <textarea
                        className="min-h-[220px] rounded-[18px] border border-input bg-white px-4 py-3 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
                        maxLength={CONTENT_LIMIT}
                        onChange={(event) => setDraftRequestText(event.target.value)}
                        value={draftRequestText}
                      />
                      <p className="m-0 text-right text-xs font-normal text-muted-foreground">{draftRequestText.length}/{CONTENT_LIMIT}</p>
                    </label>

                    <div className="rounded-[22px] border border-border/80 bg-secondary/55 px-4 py-3 text-base leading-7 text-muted-foreground">
                      <p className="m-0 font-semibold text-foreground">{item.requesterName}</p>
                      <p className="m-0">Submitted {item.createdAtLabel}</p>
                    </div>

                    {item.followUps.length > 0 ? (
                      <div className="grid gap-3">
                        <p className="m-0 text-sm font-semibold uppercase tracking-[0.08em] text-primary">Follow-ups</p>
                        {item.followUps.map((followUp) => (
                          <div key={followUp.id} className="rounded-[18px] border border-border/80 bg-white/72 px-4 py-3">
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <p className="m-0 text-sm font-semibold text-foreground">{followUp.authorName}</p>
                              <p className="m-0 text-xs font-medium text-muted-foreground">{followUp.createdAtLabel}</p>
                            </div>
                            <p className="m-0 text-base leading-7 text-muted-foreground">{followUp.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {feedback ? (
                      <div
                        className={`rounded-[18px] px-4 py-3 text-base ${
                          feedback.type === "success"
                            ? "border border-accent bg-accent/65 text-accent-foreground"
                            : "border border-destructive/25 bg-destructive/10 text-destructive"
                        }`}
                      >
                        {feedback.message}
                      </div>
                    ) : null}

                    <div className="grid gap-3">
                      <Button disabled={isSaving} onClick={() => void saveDraft(item.id)} size="lg" variant="secondary">
                        {isSaving ? <LoaderCircle className="animate-spin" /> : null}
                        Save edits
                      </Button>
                      <Button disabled={isSaving} onClick={() => void updatePrayerStatus("approved")} size="lg">
                        {isSaving ? <LoaderCircle className="animate-spin" /> : null}
                        Approve and publish
                      </Button>
                      <Button disabled={isSaving} onClick={() => void updatePrayerStatus("rejected")} size="lg" variant="secondary">
                        Reject
                      </Button>
                      <Button disabled={isSaving} onClick={closeEditor} size="lg" variant="secondary">
                        Close
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
