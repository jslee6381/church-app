"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EventRsvpStatus = "going" | "maybe" | "not_going";

type Props = {
  eventId: string;
  initialStatus: EventRsvpStatus | null;
  disabled?: boolean;
};

const OPTIONS: Array<{ value: EventRsvpStatus; label: string }> = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "not_going", label: "Not Going" },
];

export function RsvpActions({ eventId, initialStatus, disabled = false }: Props) {
  const [status, setStatus] = useState<EventRsvpStatus | null>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(disabled ? "RSVP will be available when live events are connected." : null);

  async function handleRsvp(nextStatus: EventRsvpStatus) {
    if (disabled) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save RSVP.");
      }

      setStatus(nextStatus);
      setMessage("Your RSVP has been saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save RSVP.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <Button
            key={option.value}
            className={cn(
              "w-full",
              status === option.value && "ring-4 ring-ring/40",
            )}
            disabled={disabled || isSaving}
            onClick={() => handleRsvp(option.value)}
            size="lg"
            type="button"
            variant={status === option.value ? "default" : "secondary"}
          >
            {isSaving && status !== option.value ? <LoaderCircle className="animate-spin" /> : null}
            {option.label}
          </Button>
        ))}
      </div>
      {message ? <p className="m-0 text-base leading-7 text-muted-foreground">{message}</p> : null}
    </div>
  );
}
