"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TITLE_LIMIT = 30;
const CONTENT_LIMIT = 150;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type EventItem = {
  id: string;
  title: string;
  summary: string;
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
  startsAt: string;
  imageUrl?: string | null;
  isLiveStream?: boolean;
};

type Props = {
  initialEvents: EventItem[];
};

export function EventManager({ initialEvents }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [locationName, setLocationName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [isLiveStream, setIsLiveStream] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const hasSampleEvents = events.some((item) => !UUID_PATTERN.test(item.id));

  function resetForm() {
    setEditingEventId(null);
    setTitle("");
    setSummary("");
    setLocationName("");
    setStartsAt("");
    setIsLiveStream(false);
    setImageFile(null);
  }

  function toDateTimeLocalValue(value: string) {
    const date = new Date(value);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  }

  function beginEdit(item: EventItem) {
    if (!UUID_PATTERN.test(item.id)) {
      setFeedback("Sample worship services cannot be edited here yet. Please edit database-backed events only.");
      return;
    }

    setEditingEventId(item.id);
    setTitle(item.title);
    setSummary(item.summary);
    setLocationName(item.locationLabel === "Location to be announced" ? "" : item.locationLabel);
    setStartsAt(toDateTimeLocalValue(item.startsAt));
    setIsLiveStream(Boolean(item.isLiveStream));
    setImageFile(null);
    setFeedback("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback("");

    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("summary", summary);
      formData.set("locationName", locationName);
      formData.set("startsAt", startsAt);
      formData.set("isLiveStream", String(isLiveStream));

      if (imageFile) {
        formData.set("image", imageFile);
      }

      const response = await fetch(editingEventId ? `/api/admin/events/${editingEventId}` : "/api/admin/events", {
        method: editingEventId ? "PATCH" : "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create event.");
      }

      const startsAtDate = new Date(payload.event.starts_at);
      const nextItem = {
        id: payload.event.id,
        title: payload.event.title,
        summary: payload.event.summary ?? "",
        dateLabel: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(startsAtDate),
        timeLabel: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(startsAtDate),
        locationLabel: payload.event.location_name ?? "Location to be announced",
        startsAt: payload.event.starts_at,
        imageUrl: payload.event.image_url ?? null,
        isLiveStream: payload.event.is_live_stream ?? false,
      } satisfies EventItem;

      setEvents((current) =>
        editingEventId ? current.map((item) => (item.id === editingEventId ? nextItem : item)) : [nextItem, ...current],
      );
      resetForm();
      setFeedback(editingEventId ? "Event updated." : "Event published.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : `Unable to ${editingEventId ? "update" : "create"} event.`);
    } finally {
      setIsSaving(false);
    }
  }

  async function importSampleEvents() {
    setIsImporting(true);
    setFeedback("");

    try {
      const response = await fetch("/api/admin/events/import", {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to import events.");
      }

      setFeedback(payload.importedCount > 0 ? `${payload.importedCount} events imported.` : "Events were already imported.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to import events.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <p className="section-kicker">Events</p>
        <CardTitle>{editingEventId ? "Edit event" : "Create and publish events"}</CardTitle>
        <CardDescription>Add title, location, date, and an optional image link for the member-facing Events page.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {hasSampleEvents ? (
          <div className="grid gap-3 rounded-[18px] border border-border/80 bg-white/72 p-4">
            <p className="m-0 text-sm leading-6 text-muted-foreground">
              Some real church events are still loaded from the built-in schedule. Import them once to make them fully editable here.
            </p>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-[16px] border border-border/80 bg-white px-4 text-sm font-semibold text-foreground disabled:opacity-60"
              disabled={isImporting}
              onClick={importSampleEvents}
              type="button"
            >
              {isImporting ? <LoaderCircle className="size-4 animate-spin" /> : "Import current schedule"}
            </button>
          </div>
        ) : null}

        <form className="grid gap-3" onSubmit={handleSubmit}>
          <input className="min-h-12 rounded-[16px] border border-input bg-white px-4 py-3" maxLength={TITLE_LIMIT} onChange={(event) => setTitle(event.target.value)} placeholder="Event title" value={title} />
          <p className="m-0 -mt-1 text-right text-xs text-muted-foreground">{title.length}/{TITLE_LIMIT}</p>
          <textarea className="min-h-[110px] rounded-[16px] border border-input bg-white px-4 py-3" maxLength={CONTENT_LIMIT} onChange={(event) => setSummary(event.target.value)} placeholder="Short description" value={summary} />
          <p className="m-0 -mt-1 text-right text-xs text-muted-foreground">{summary.length}/{CONTENT_LIMIT}</p>
          <input className="min-h-12 rounded-[16px] border border-input bg-white px-4 py-3" onChange={(event) => setLocationName(event.target.value)} placeholder="Location" value={locationName} />
          <input className="min-h-12 rounded-[16px] border border-input bg-white px-4 py-3" onChange={(event) => setStartsAt(event.target.value)} type="datetime-local" value={startsAt} />
          <label className="inline-flex min-h-12 items-center gap-3 rounded-[16px] border border-input bg-white px-4 py-3 text-sm font-medium text-foreground">
            <input checked={isLiveStream} className="size-4 accent-[var(--primary)]" onChange={(event) => setIsLiveStream(event.target.checked)} type="checkbox" />
            Live Stream
          </label>
          <label className="grid gap-2 text-sm font-medium text-muted-foreground">
            Event image optional, JPG/PNG/WEBP up to 8 MB
            <input
              accept="image/jpeg,image/png,image/webp"
              className="min-h-12 rounded-[16px] border border-input bg-white px-4 py-3 file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-accent-foreground"
              onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <button className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-60" disabled={isSaving} type="submit">
            {isSaving ? <LoaderCircle className="size-5 animate-spin" /> : editingEventId ? "Update event" : "Publish event"}
          </button>
          {editingEventId ? (
            <button
              className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-border/80 bg-white px-5 text-base font-semibold text-foreground"
              onClick={resetForm}
              type="button"
            >
              Cancel
            </button>
          ) : null}
          {feedback ? <p className="m-0 text-sm text-muted-foreground">{feedback}</p> : null}
        </form>

        <div className="grid gap-3">
          {events.map((item) => (
            <div key={item.id} className="rounded-[22px] border border-border/80 bg-white/72 p-4">
              <p className="m-0 text-lg font-semibold text-foreground">{item.title}</p>
              <p className="m-0 mt-1 text-base leading-7 text-muted-foreground">
                {item.dateLabel} · {item.timeLabel}
              </p>
              <p className="m-0 mt-1 text-sm text-muted-foreground">{item.locationLabel}</p>
              {item.isLiveStream ? <p className="m-0 mt-2 text-sm font-semibold text-primary">Live Stream enabled</p> : null}
              {UUID_PATTERN.test(item.id) ? (
                <div className="mt-3">
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-[14px] border border-border/80 bg-white px-4 text-sm font-semibold text-foreground"
                    onClick={() => beginEdit(item)}
                    type="button"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <p className="m-0 mt-3 text-sm text-muted-foreground">Sample service schedule</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
