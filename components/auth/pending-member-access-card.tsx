"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { GoogleSignOutButton } from "@/components/auth/google-sign-out-button";

type Props = {
  initialDisplayName: string;
};

export function PendingMemberAccessCard({ initialDisplayName }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
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
          displayName,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save display name.");
      }

      setDisplayName(payload.member.display_name ?? displayName);
      setFeedback("Display name saved. Member access will unlock after admin approval.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save display name.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mb-5 rounded-[18px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] p-6 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-primary">Awaiting Approval</p>
          <h1 className="mb-3 mt-3 font-sans text-[1.6rem] leading-tight text-foreground">
            You are signed in. A church admin still needs to approve your member access.
          </h1>
          <p className="m-0 text-[1rem] leading-7 text-muted-foreground">
            Choose the display name the community should see. Once an admin approves your membership, Prayer posting will unlock automatically.
          </p>
        </div>
        <GoogleSignOutButton />
      </div>

      <form className="mt-5 grid gap-3" onSubmit={handleSave}>
        <label className="grid gap-2 text-base font-semibold text-foreground">
          Display name
          <input
            className="min-h-12 rounded-[18px] border border-input bg-white px-4 py-3 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(31,92,84,0.12)]"
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="e.g. Grace Kim"
            value={displayName}
          />
        </label>
        <button
          className="inline-flex min-h-12 items-center justify-center rounded-[18px] bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? <LoaderCircle className="size-5 animate-spin" /> : "Save display name"}
        </button>
      </form>

      {feedback ? <p className="mb-0 mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
    </section>
  );
}
