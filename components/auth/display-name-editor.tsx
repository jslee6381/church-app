"use client";

import { useState } from "react";
import { LoaderCircle, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  initialDisplayName: string;
};

export function DisplayNameEditor({ initialDisplayName }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [draftName, setDraftName] = useState(initialDisplayName);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback("");

    try {
      const response = await fetch("/api/member/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: draftName,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save display name.");
      }

      const savedName = payload.member.display_name ?? draftName;
      setDisplayName(savedName);
      setDraftName(savedName);
      setIsEditing(false);
      setFeedback("Display name updated.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save display name.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mb-4 border-t border-border/70 pt-4">
      {!isEditing ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-primary">Display Name</p>
            <p className="m-0 mt-1 text-lg font-semibold text-foreground">{displayName}</p>
          </div>
          <Button className="min-h-10 rounded-[16px]" onClick={() => setIsEditing(true)} size="sm" type="button" variant="secondary">
            <PencilLine className="size-4" />
            Edit
          </Button>
        </div>
      ) : (
        <form className="grid gap-3" onSubmit={handleSave}>
          <label className="grid gap-2 text-base font-semibold text-foreground">
            Display name
            <input
              className="min-h-12 w-full rounded-[18px] border border-input bg-white px-4 py-3 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="e.g. Grace Kim"
              value={draftName}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="min-h-11 w-full rounded-[16px]"
              onClick={() => {
                setDraftName(displayName);
                setIsEditing(false);
                setFeedback("");
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button className="min-h-11 w-full rounded-[16px]" disabled={isSaving} size="sm" type="submit">
              {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      )}

      {feedback ? <p className="mb-0 mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
    </section>
  );
}
