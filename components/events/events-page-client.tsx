"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ImagePlus, LoaderCircle, MapPin, MoreVertical, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatEasternDateTimeLocalValue, formatEasternDayNumber, formatEasternEventDate, formatEasternEventTime, formatEasternMonthHeading, formatEasternWeekday } from "@/lib/eastern-time";
import type { EventListItem } from "@/lib/events";

const TITLE_LIMIT = 50;
const CONTENT_LIMIT = 150;
const MIN_TEXTAREA_HEIGHT = 44;
const MAX_TEXTAREA_HEIGHT = 180;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = {
  canManage: boolean;
  initialEvents: EventListItem[];
};

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;

  textarea.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
  textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
}

export function EventsPageClient({ canManage, initialEvents }: Props) {
  const router = useRouter();
  const composerRef = useRef<HTMLDivElement | null>(null);
  const menuAreaRef = useRef<HTMLDivElement | null>(null);
  const [events, setEvents] = useState(initialEvents);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [locationName, setLocationName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [isLiveStream, setIsLiveStream] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isDuplicatingId, setIsDuplicatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [openMenuEventId, setOpenMenuEventId] = useState<string | null>(null);

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
    if (!openMenuEventId) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuAreaRef.current?.contains(event.target as Node)) {
        setOpenMenuEventId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [openMenuEventId]);

  function resetForm() {
    setEditingEventId(null);
    setTitle("");
    setSummary("");
    setLocationName("");
    setStartsAt("");
    setIsLiveStream(false);
    setImageFile(null);
    setExistingImageUrl(null);
    setRemoveExistingImage(false);
    setImagePreviewUrl(null);
    setIsComposerOpen(false);
  }

  function resetInlineEdit() {
    setEditingEventId(null);
    setTitle("");
    setSummary("");
    setLocationName("");
    setStartsAt("");
    setIsLiveStream(false);
    setImageFile(null);
    setExistingImageUrl(null);
    setRemoveExistingImage(false);
    setImagePreviewUrl(null);
  }

  function beginEdit(event: EventListItem) {
    if (!UUID_PATTERN.test(event.id)) {
      setFeedback("Only saved events can be edited here.");
      return;
    }

    setEditingEventId(event.id);
    setTitle(event.title);
    setSummary(event.summary ?? "");
    setLocationName(event.locationName ?? "");
    setStartsAt(formatEasternDateTimeLocalValue(event.startsAt));
    setIsLiveStream(Boolean(event.isLiveStream));
    setImageFile(null);
    setExistingImageUrl(event.imageUrl ?? event.posterSrc ?? null);
    setRemoveExistingImage(false);
    setImagePreviewUrl(null);
    setFeedback("");
    setOpenMenuEventId(null);
  }

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

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
      formData.set("removeImage", String(removeExistingImage && !imageFile));

      if (imageFile) {
        formData.set("image", imageFile);
      }

      const response = await fetch(editingEventId ? `/api/admin/events/${editingEventId}` : "/api/admin/events", {
        method: editingEventId ? "PATCH" : "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save event.");
      }

      const nextEvent: EventListItem = {
        id: payload.event.id,
        title: payload.event.title,
        summary: payload.event.summary ?? "",
        description: payload.event.summary ?? "",
        startsAt: payload.event.starts_at,
        endsAt: null,
        locationName: payload.event.location_name ?? null,
        locationAddress: null,
        imageUrl: payload.event.image_url ?? null,
        isLiveStream: payload.event.is_live_stream ?? false,
        liveStreamUrl: payload.event.live_stream_url ?? null,
      };

      setEvents((current) => {
        const updated = editingEventId
          ? current.map((item) => (item.id === editingEventId ? nextEvent : item))
          : [...current, nextEvent];

        return updated.sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
      });

      if (editingEventId) {
        resetInlineEdit();
      } else {
        resetForm();
      }
      setFeedback(editingEventId ? "Event updated." : "Event published.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save event.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteEvent(eventId: string) {
    if (!UUID_PATTERN.test(eventId)) {
      setFeedback("Only saved events can be deleted here.");
      return;
    }

    setIsDeletingId(eventId);
    setFeedback("");

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete event.");
      }

      setEvents((current) => current.filter((item) => item.id !== eventId));
      if (editingEventId === eventId) {
        resetForm();
      }
      setFeedback(payload.message ?? "Event deleted.");
      setOpenMenuEventId(null);
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to delete event.");
    } finally {
      setIsDeletingId(null);
    }
  }

  async function duplicateEvent(eventToDuplicate: EventListItem) {
    if (!UUID_PATTERN.test(eventToDuplicate.id)) {
      setFeedback("Only saved events can be duplicated here.");
      return;
    }

    setIsDuplicatingId(eventToDuplicate.id);
    setFeedback("");

    try {
      const response = await fetch(`/api/admin/events/${eventToDuplicate.id}/duplicate`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to duplicate event.");
      }

      const duplicatedEvent: EventListItem = {
        id: payload.event.id,
        title: payload.event.title,
        summary: payload.event.summary ?? "",
        description: payload.event.summary ?? "",
        startsAt: payload.event.starts_at,
        endsAt: null,
        locationName: payload.event.location_name ?? null,
        locationAddress: null,
        imageUrl: payload.event.image_url ?? null,
        isLiveStream: payload.event.is_live_stream ?? false,
        liveStreamUrl: payload.event.live_stream_url ?? null,
      };

      setEvents((current) => {
        const sourceIndex = current.findIndex((item) => item.id === eventToDuplicate.id);

        if (sourceIndex === -1) {
          return [...current, duplicatedEvent];
        }

        return [...current.slice(0, sourceIndex + 1), duplicatedEvent, ...current.slice(sourceIndex + 1)];
      });
      setFeedback("Event duplicated.");
      setOpenMenuEventId(null);
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to duplicate event.");
    } finally {
      setIsDuplicatingId(null);
    }
  }

  function clearSelectedImage() {
    setImageFile(null);
    setImagePreviewUrl(null);
  }

  function removeCurrentImage() {
    setImageFile(null);
    setImagePreviewUrl(null);
    setExistingImageUrl(null);
    setRemoveExistingImage(true);
  }

  let lastMonthHeading = "";

  return (
    <section className="space-y-4">
      {canManage ? (
        <div
          ref={composerRef}
          className="event-form-surface rounded-[18px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] p-4 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)]"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              aria-label={editingEventId ? "Editing event" : isComposerOpen ? "Close event form" : "Create event"}
              className="event-form-input inline-flex size-11 items-center justify-center rounded-full border border-border/80 bg-white text-foreground"
              onClick={() => {
                if (isComposerOpen && !editingEventId) {
                  setIsComposerOpen(false);
                } else {
                  setIsComposerOpen(true);
                }
              }}
              type="button"
            >
              <Plus className={`size-5 transition-transform ${isComposerOpen || editingEventId ? "rotate-45" : ""}`} />
            </button>
          </div>

          {isComposerOpen ? (
            <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
              {editingEventId ? (
                <p className="m-0 text-sm font-semibold text-primary">Editing selected event</p>
              ) : null}
              <div className="relative">
                <input
                  className="event-form-input min-h-12 w-full rounded-[16px] border border-input bg-white px-4 py-3 pr-16"
                  maxLength={TITLE_LIMIT}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Event title"
                  value={title}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {title.length}/{TITLE_LIMIT}
                </span>
              </div>
              <div className="relative">
                <textarea
                  className="event-form-input min-h-[44px] w-full resize-none rounded-[16px] border border-input bg-white px-4 py-3 pb-8"
                  maxLength={CONTENT_LIMIT}
                  onChange={(event) => { resizeTextarea(event.currentTarget); setSummary(event.target.value); }}
                  ref={(node) => resizeTextarea(node)}
                  rows={1}
                  placeholder="Short description"
                  value={summary}
                />
                <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
                  {summary.length}/{CONTENT_LIMIT}
                </span>
              </div>
              <input
                className="event-form-input min-h-12 rounded-[16px] border border-input bg-white px-4 py-3"
                onChange={(event) => setLocationName(event.target.value)}
                placeholder="Location"
                value={locationName}
              />
              <input
                className="event-form-input min-h-12 rounded-[16px] border border-input bg-white px-4 py-3"
                onChange={(event) => setStartsAt(event.target.value)}
                type="datetime-local"
                value={startsAt}
              />
              <label className="event-form-input inline-flex min-h-12 items-center gap-3 rounded-[16px] border border-input bg-white px-4 py-3 text-sm font-medium text-foreground">
                <input
                  checked={isLiveStream}
                  className="size-4 accent-[var(--primary)]"
                  onChange={(event) => setIsLiveStream(event.target.checked)}
                  type="checkbox"
                />
                Live Stream
              </label>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-border/80 p-2 text-foreground">
                  <ImagePlus className="size-5" />
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;
                      setImageFile(nextFile);
                      setRemoveExistingImage(false);
                    }}
                    type="file"
                  />
                </label>
                <span>{imagePreviewUrl || existingImageUrl ? "Photo selected" : "Add photo"}</span>
              </div>
              {imagePreviewUrl || existingImageUrl ? (
                <div className="event-form-input grid gap-3 rounded-[16px] border border-border/70 bg-white p-3">
                  <img
                    alt="Event preview"
                    className="block w-full rounded-[12px]"
                    src={imagePreviewUrl ?? existingImageUrl ?? ""}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className="event-form-input inline-flex min-h-11 items-center justify-center rounded-[14px] border border-border/80 bg-white px-4 text-sm font-semibold text-foreground"
                      onClick={imagePreviewUrl ? clearSelectedImage : removeCurrentImage}
                      type="button"
                    >
                      {imagePreviewUrl ? "Clear selected image" : "Remove image"}
                    </button>
                    <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[14px] bg-primary px-4 text-sm font-semibold text-primary-foreground">
                      Replace image
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                          const nextFile = event.target.files?.[0] ?? null;
                          setImageFile(nextFile);
                          setRemoveExistingImage(false);
                        }}
                        type="file"
                      />
                    </label>
                  </div>
                </div>
              ) : null}
              <button
                className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? <LoaderCircle className="size-5 animate-spin" /> : "Publish event"}
              </button>
            </form>
          ) : null}

          {feedback ? <p className="mb-0 mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
        </div>
      ) : null}

      {events.map((event) => {
        const monthHeading = formatEasternMonthHeading(event.startsAt);
        const showMonthHeading = monthHeading !== lastMonthHeading;

        lastMonthHeading = monthHeading;

        return (
          <div key={event.id} className="space-y-4">
            {showMonthHeading ? <div className="ui-text py-1 text-center font-sans font-semibold text-foreground">{monthHeading}</div> : null}

            <article
              id={`event-${event.id}`}
              className={`event-surface rounded-[18px] bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] px-4 pt-4 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)] ${
                "relative "
              }${
                event.variant !== "service-pair" && event.variant !== "united-service" && (event.posterSrc || event.imageUrl)
                  ? "pb-0"
                  : "pb-4"
              } scroll-mt-6 ${
                event.variant === "united-service" ? "border-2 border-primary/28" : "border border-border/80"
              }`}
            >
              {canManage && editingEventId !== event.id ? (
                <div ref={openMenuEventId === event.id ? menuAreaRef : null} className="absolute right-3 top-3 z-10">
                  <div className="relative">
                    <button
                      aria-label="Event actions"
                      className="inline-flex size-10 items-center justify-center bg-transparent text-foreground"
                      onClick={() =>
                        setOpenMenuEventId((current) => (current === event.id ? null : event.id))
                      }
                      type="button"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {openMenuEventId === event.id ? (
                      <div className="event-card-surface absolute right-0 top-[calc(100%+0.25rem)] z-20 min-w-[148px] overflow-hidden rounded-[14px] border border-border bg-background shadow-[0_4px_12px_rgba(68,52,35,0.08)]">
                        <button
                          className="flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold text-foreground"
                          onClick={() => beginEdit(event)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold text-foreground disabled:opacity-60"
                          disabled={isDeletingId === event.id}
                          onClick={() => deleteEvent(event.id)}
                          type="button"
                        >
                          {isDeletingId === event.id ? <LoaderCircle className="size-4 animate-spin" /> : "Delete"}
                        </button>
                        <button
                          className="flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold text-foreground disabled:opacity-60"
                          disabled={isDuplicatingId === event.id}
                          onClick={() => duplicateEvent(event)}
                          type="button"
                        >
                          {isDuplicatingId === event.id ? <LoaderCircle className="size-4 animate-spin" /> : "Duplicate"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4">
                <div className="flex flex-col items-center justify-start pt-1 text-center">
                  <p className="m-0 font-sans text-[2rem] font-semibold leading-none text-foreground">{formatEasternDayNumber(event.startsAt)}</p>
                  <p className="mt-1 mb-0 text-sm font-medium uppercase tracking-[0.06em] text-muted-foreground">{formatEasternWeekday(event.startsAt)}</p>
                </div>

                <div className="min-w-0 overflow-hidden">
                  {event.variant === "service-pair" && event.services ? (
                    <>
                      <p className="ui-text m-0 flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="size-4 text-primary" />
                        <span>{formatEasternEventDate(event.startsAt)}</span>
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                        {event.services.map((service) => (
                          <div key={service.title} className="event-surface-sub rounded-[14px] bg-white/70 px-3 py-4">
                            <p className="ui-text m-0 font-sans font-semibold text-foreground">
                              {service.title}
                            </p>
                            <p className="ui-text mt-1 mb-0 text-muted-foreground">
                              {service.startsAt ? formatEasternEventTime(service.startsAt) : service.time}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : event.variant === "united-service" ? (
                    <>
                      <p className="ui-text m-0 text-center font-sans font-semibold text-foreground">
                        {event.title}
                      </p>
                      <p className="ui-text mt-4 mb-0 flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="size-4 text-primary" />
                        <span>{formatEasternEventDate(event.startsAt)} · {formatEasternEventTime(event.startsAt)}</span>
                      </p>
                      {event.locationName ? (
                        <p className="ui-text mt-2 mb-0 flex items-center gap-2 text-muted-foreground">
                          <MapPin className="size-4 text-primary" />
                          <span>{event.locationName}</span>
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {editingEventId === event.id ? (
                        <form className="grid min-w-0 max-w-full gap-3 overflow-hidden" onSubmit={handleSubmit}>
                          <div className="relative">
                            <input
                              className="event-form-input min-h-12 w-full min-w-0 max-w-full rounded-[16px] border border-input bg-white px-4 py-3 pr-16"
                              maxLength={TITLE_LIMIT}
                              onChange={(event) => setTitle(event.target.value)}
                              placeholder="Event title"
                              value={title}
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              {title.length}/{TITLE_LIMIT}
                            </span>
                          </div>
                          <div className="relative">
                            <textarea
                              className="event-form-input min-h-[44px] w-full min-w-0 max-w-full resize-none rounded-[16px] border border-input bg-white px-4 py-3 pb-8"
                              maxLength={CONTENT_LIMIT}
                              onChange={(event) => { resizeTextarea(event.currentTarget); setSummary(event.target.value); }}
                              ref={(node) => resizeTextarea(node)}
                              rows={1}
                              placeholder="Short description"
                              value={summary}
                            />
                            <span className="pointer-events-none absolute bottom-3 right-4 text-xs text-muted-foreground">
                              {summary.length}/{CONTENT_LIMIT}
                            </span>
                          </div>
                          <input
                            className="event-form-input min-h-12 w-full min-w-0 max-w-full rounded-[16px] border border-input bg-white px-4 py-3"
                            onChange={(event) => setLocationName(event.target.value)}
                            placeholder="Location"
                            value={locationName}
                          />
                          <input
                            className="event-form-input min-h-12 w-full min-w-0 max-w-full rounded-[16px] border border-input bg-white px-4 py-3"
                            onChange={(event) => setStartsAt(event.target.value)}
                            type="datetime-local"
                            value={startsAt}
                          />
                          <label className="event-form-input inline-flex min-h-12 w-full min-w-0 max-w-full items-center gap-3 rounded-[16px] border border-input bg-white px-4 py-3 text-sm font-medium text-foreground">
                            <input
                              checked={isLiveStream}
                              className="size-4 accent-[var(--primary)]"
                              onChange={(event) => setIsLiveStream(event.target.checked)}
                              type="checkbox"
                            />
                            Live Stream
                          </label>
                          <div className="flex w-full min-w-0 max-w-full items-center gap-3 text-sm text-muted-foreground">
                            <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-border/80 p-2 text-foreground">
                              <ImagePlus className="size-5" />
                              <input
                                accept="image/jpeg,image/png,image/webp"
                                className="sr-only"
                                onChange={(event) => {
                                  const nextFile = event.target.files?.[0] ?? null;
                                  setImageFile(nextFile);
                                  setRemoveExistingImage(false);
                                }}
                                type="file"
                              />
                            </label>
                            <span>{imagePreviewUrl || existingImageUrl ? "Photo selected" : "Add photo"}</span>
                          </div>
                          {imagePreviewUrl || existingImageUrl ? (
                            <div className="event-form-input grid w-full min-w-0 max-w-full gap-3 rounded-[16px] border border-border/70 bg-white p-3">
                              <img
                                alt="Event preview"
                                className="block w-full rounded-[12px]"
                                src={imagePreviewUrl ?? existingImageUrl ?? ""}
                              />
                              <button
                                className="event-form-input inline-flex min-h-11 w-full items-center justify-center rounded-[14px] border border-border/80 bg-white px-4 text-sm font-semibold text-foreground"
                                onClick={imagePreviewUrl ? clearSelectedImage : removeCurrentImage}
                                type="button"
                              >
                                {imagePreviewUrl ? "Clear selected image" : "Remove image"}
                              </button>
                            </div>
                          ) : null}
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              className="event-form-input inline-flex min-h-12 w-full items-center justify-center rounded-[16px] border border-border/80 bg-white px-5 text-base font-semibold text-foreground"
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
                              {isSaving ? <LoaderCircle className="size-5 animate-spin" /> : "Update"}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <h2 className="ui-text m-0 min-w-0 pr-10 font-sans font-semibold leading-tight text-foreground">
                              {event.title}
                            </h2>
                          </div>
                          <p className="ui-text mt-2 mb-0 flex items-center gap-2 text-muted-foreground">
                            <CalendarDays className="size-4 text-primary" />
                            <span>
                              {formatEasternEventDate(event.startsAt)} · {formatEasternEventTime(event.startsAt)}
                            </span>
                          </p>
                          {event.locationName ? (
                            <p className="ui-text mt-2 mb-0 flex items-center gap-2 text-muted-foreground">
                              <MapPin className="size-4 text-primary" />
                              <span>{event.locationName}</span>
                            </p>
                          ) : null}
                          {event.summary ? <p className="ui-text mt-3 mb-0 text-muted-foreground">{event.summary}</p> : null}
                        </>
                      )}
                    </>
                  )}

                </div>
              </div>
              {event.variant !== "service-pair" && event.variant !== "united-service" && (event.posterSrc || event.imageUrl) ? (
                <div className="mt-4 -mx-4">
                  {event.isLiveStream && event.liveStreamUrl ? (
                    <a href={event.liveStreamUrl} rel="noreferrer" target="_blank">
                      <img
                        alt={event.posterAlt ?? event.title}
                        className="block w-full rounded-b-[18px]"
                        src={event.posterSrc ?? event.imageUrl ?? ""}
                      />
                    </a>
                  ) : (
                    <img
                      alt={event.posterAlt ?? event.title}
                      className="block w-full rounded-b-[18px]"
                      src={event.posterSrc ?? event.imageUrl ?? ""}
                    />
                  )}
                </div>
              ) : null}
            </article>
          </div>
        );
      })}
    </section>
  );
}
