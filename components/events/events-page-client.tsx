"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, MapPin, MoreVertical, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatEasternDateTimeLocalValue, formatEasternEventDate, formatEasternEventTime, formatEasternWeekday } from "@/lib/eastern-time";
import type { EventListItem } from "@/lib/events";

const TITLE_LIMIT = 50;
const CONTENT_LIMIT = 150;
const MIN_TEXTAREA_HEIGHT = 44;
const MAX_TEXTAREA_HEIGHT = 180;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EASTERN_TIME_ZONE = "America/New_York";

type Props = {
  canManage: boolean;
  initialEvents: EventListItem[];
};

type EventDisplayItem = {
  event: EventListItem;
  monthKey: string;
};

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;

  textarea.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
  textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
}

function sortEvents(items: EventListItem[]) {
  return [...items].sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

function splitDateTimeValue(value: string | null | undefined) {
  if (!value) {
    return { date: "", time: "" };
  }

  const formatted = formatEasternDateTimeLocalValue(value);
  const [date = "", time = ""] = formatted.split("T");
  return { date, time };
}

function combineDateTimeValue(date: string, time: string) {
  if (!date || !time) {
    return "";
  }

  return `${date}T${time}`;
}

function addHoursToTimeValue(time: string, hours: number) {
  if (!time || !time.includes(":")) {
    return "";
  }

  const [hourText = "0", minuteText = "0"] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return "";
  }

  const totalMinutes = ((hour + hours) * 60 + minute) % (24 * 60);
  const normalized = totalMinutes < 0 ? totalMinutes + 24 * 60 : totalMinutes;
  const nextHour = String(Math.floor(normalized / 60)).padStart(2, "0");
  const nextMinute = String(normalized % 60).padStart(2, "0");

  return `${nextHour}:${nextMinute}`;
}

function isAllDayRange(startTime: string, endTime: string) {
  return startTime === "00:00" && endTime === "23:59";
}

function isAllDayEvent(event: EventListItem) {
  const start = splitDateTimeValue(event.startsAt);
  const end = splitDateTimeValue(event.endsAt ?? event.startsAt);
  return isAllDayRange(start.time, end.time || "23:59");
}

function getMonthParts(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).formatToParts(new Date(value));

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function getMonthKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(value));

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}`;
}

function getMonthLabel(value: string) {
  return getMonthParts(value).month;
}

function getNumericMonthDay(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.month}/${values.day}`;
}

function getDayNumber(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    day: "numeric",
  }).format(new Date(value));
}

function hasDifferentStartAndEndDate(event: EventListItem) {
  if (!event.endsAt) {
    return false;
  }

  const start = formatEasternEventDate(event.startsAt);
  const end = formatEasternEventDate(event.endsAt);
  return start !== end;
}

function spansMultipleMonths(event: EventListItem) {
  return Boolean(event.endsAt && getMonthKey(event.startsAt) !== getMonthKey(event.endsAt));
}

function getEventDisplayItems(items: EventListItem[]) {
  const displayItems: EventDisplayItem[] = [];

  for (const event of items) {
    const startMonthKey = getMonthKey(event.startsAt);
    displayItems.push({ event, monthKey: startMonthKey });

    if (spansMultipleMonths(event) && event.endsAt) {
      const endMonthKey = getMonthKey(event.endsAt);
      if (endMonthKey != startMonthKey) {
        displayItems.push({ event, monthKey: endMonthKey });
      }
    }
  }

  return displayItems.sort((left, right) => {
    const monthCompare = left.monthKey.localeCompare(right.monthKey);
    if (monthCompare != 0) {
      return monthCompare;
    }
    return new Date(left.event.startsAt).getTime() - new Date(right.event.startsAt).getTime();
  });
}

function getEventReferenceTime(event: EventListItem) {
  return new Date(event.endsAt ?? event.startsAt).getTime();
}

function getInitialMonthIndex(events: EventListItem[]) {
  if (events.length === 0) {
    return 0;
  }

  const now = Date.now();
  const firstActiveEvent = events.find((event) => getEventReferenceTime(event) >= now) ?? events[events.length - 1];
  const targetKey = getMonthKey(firstActiveEvent.startsAt);
  const uniqueKeys: string[] = [];

  for (const event of events) {
    const key = getMonthKey(event.startsAt);
    if (!uniqueKeys.includes(key)) {
      uniqueKeys.push(key);
    }
  }

  return Math.max(0, uniqueKeys.indexOf(targetKey));
}

export function EventsPageClient({ canManage, initialEvents }: Props) {
  const router = useRouter();
  const composerRef = useRef<HTMLDivElement | null>(null);
  const menuAreaRef = useRef<HTMLDivElement | null>(null);
  const [events, setEvents] = useState(() => sortEvents(initialEvents));
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [locationName, setLocationName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
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
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(() => getInitialMonthIndex(initialEvents));
  const [arePastEventsCollapsed, setArePastEventsCollapsed] = useState(true);

  useEffect(() => {
    setEvents(sortEvents(initialEvents));
  }, [initialEvents]);

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

  const displayItems = getEventDisplayItems(events);
  const monthGroups: Array<{ key: string; label: string }> = [];
  for (const item of displayItems) {
    if (!monthGroups.some((group) => group.key === item.monthKey)) {
      const monthSource = item.monthKey === getMonthKey(item.event.startsAt)
        ? item.event.startsAt
        : item.event.endsAt ?? item.event.startsAt;
      monthGroups.push({ key: item.monthKey, label: getMonthLabel(monthSource) });
    }
  }

  useEffect(() => {
    if (monthGroups.length === 0 && selectedMonthIndex !== 0) {
      setSelectedMonthIndex(0);
      return;
    }

    if (monthGroups.length > 0 && selectedMonthIndex > monthGroups.length - 1) {
      setSelectedMonthIndex(monthGroups.length - 1);
    }
  }, [monthGroups.length, selectedMonthIndex]);

  const selectedMonth = monthGroups[Math.min(selectedMonthIndex, Math.max(monthGroups.length - 1, 0))] ?? null;
  const visibleEvents = selectedMonth ? displayItems.filter((item) => item.monthKey === selectedMonth.key) : displayItems;
  const canGoPreviousMonth = selectedMonthIndex > 0;
  const canGoNextMonth = selectedMonthIndex < monthGroups.length - 1;
  const currentMonthKey = getMonthKey(new Date().toISOString());
  const isCurrentMonthView = Boolean(selectedMonth && selectedMonth.key === currentMonthKey);
  const hasPastEventsInSelectedMonth = isCurrentMonthView && visibleEvents.some((item) => isPastEvent(item.event));

  function resetForm() {
    setEditingEventId(null);
    setTitle("");
    setSummary("");
    setLocationName("");
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setIsAllDay(false);
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
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setIsAllDay(false);
    setIsLiveStream(false);
    setImageFile(null);
    setExistingImageUrl(null);
    setRemoveExistingImage(false);
    setImagePreviewUrl(null);
  }

  function handleStartDateChange(nextDate: string) {
    setStartDate((previousDate) => {
      if (!endDate || endDate === previousDate) {
        setEndDate(nextDate);
      }
      return nextDate;
    });
  }

  function handleStartTimeChange(nextTime: string) {
    setStartTime((previousTime) => {
      const previousSuggestedEndTime = addHoursToTimeValue(previousTime, 2);
      const nextSuggestedEndTime = addHoursToTimeValue(nextTime, 2);

      if (!endTime || endTime === previousTime || endTime === previousSuggestedEndTime) {
        setEndTime(nextSuggestedEndTime);
      }

      return nextTime;
    });
  }

  function handleAllDayChange(checked: boolean) {
    setIsAllDay(checked);

    if (checked) {
      if (startDate && !endDate) {
        setEndDate(startDate);
      }
      setStartTime("00:00");
      setEndTime("23:59");
      return;
    }

    const nextStartTime = startTime && startTime !== "00:00" ? startTime : "09:00";
    setStartTime(nextStartTime);
    setEndTime(endTime && endTime !== "23:59" ? endTime : addHoursToTimeValue(nextStartTime, 2));
    if (startDate && !endDate) {
      setEndDate(startDate);
    }
  }

  function beginEdit(event: EventListItem) {
    if (!UUID_PATTERN.test(event.id)) {
      setFeedback("Only saved events can be edited here.");
      return;
    }

    const start = splitDateTimeValue(event.startsAt);
    const end = splitDateTimeValue(event.endsAt ?? event.startsAt);
    const nextIsAllDay = isAllDayRange(start.time, end.time || "23:59");

    setEditingEventId(event.id);
    setTitle(event.title);
    setSummary(event.summary ?? "");
    setLocationName(event.locationName ?? "");
    setStartDate(start.date);
    setStartTime(start.time);
    setEndDate(end.date || start.date);
    setEndTime(nextIsAllDay ? "23:59" : end.time || start.time);
    setIsAllDay(nextIsAllDay);
    setStartTime(nextIsAllDay ? "00:00" : start.time);
    setIsLiveStream(Boolean(event.isLiveStream));
    setImageFile(null);
    setExistingImageUrl(event.imageUrl ?? event.posterSrc ?? null);
    setRemoveExistingImage(false);
    setImagePreviewUrl(null);
    setFeedback("");
    setOpenMenuEventId(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback("");

    try {
      const normalizedStartsAt = combineDateTimeValue(startDate, isAllDay ? "00:00" : startTime);
      const normalizedEndsAt = combineDateTimeValue(endDate || startDate, isAllDay ? "23:59" : endTime);

      if (!normalizedStartsAt) {
        throw new Error(isAllDay ? "Start date is required." : "Start date and time are required.");
      }

      if (!normalizedEndsAt) {
        throw new Error(isAllDay ? "End date is required." : "End date and time are required.");
      }

      if (normalizedEndsAt < normalizedStartsAt) {
        throw new Error("End time must be after the start time.");
      }

      const formData = new FormData();
      formData.set("title", title);
      formData.set("summary", summary);
      formData.set("locationName", locationName);
      formData.set("startsAt", normalizedStartsAt);
      formData.set("endsAt", normalizedEndsAt);
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
        endsAt: payload.event.ends_at ?? null,
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

        return sortEvents(updated);
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
        endsAt: payload.event.ends_at ?? null,
        locationName: payload.event.location_name ?? null,
        locationAddress: null,
        imageUrl: payload.event.image_url ?? null,
        isLiveStream: payload.event.is_live_stream ?? false,
        liveStreamUrl: payload.event.live_stream_url ?? null,
      };

      setEvents((current) => {
        const sourceIndex = current.findIndex((item) => item.id === eventToDuplicate.id);

        if (sourceIndex === -1) {
          return sortEvents([...current, duplicatedEvent]);
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

  function isPastEvent(event: EventListItem) {
    return getEventReferenceTime(event) < Date.now();
  }

  function renderDateTimeFields() {
    return (
      <div className="grid gap-3">
        <label className="event-form-input inline-flex min-h-10 items-center gap-3 rounded-[14px] border border-input bg-white px-3 py-2 text-sm font-medium text-foreground">
          <input
            checked={isAllDay}
            className="size-4 accent-[var(--primary)]"
            onChange={(event) => handleAllDayChange(event.target.checked)}
            type="checkbox"
          />
          No time
        </label>
        <div className="grid gap-2">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Start</p>
          <div className={`grid gap-2.5 ${isAllDay ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]"}`}>
            <label className="grid gap-1">
              <span className="px-1 text-xs text-muted-foreground">Date</span>
              <input
                className="event-form-input min-h-10 rounded-[14px] border border-input bg-white px-3 py-2 text-sm"
                onChange={(event) => handleStartDateChange(event.target.value)}
                type="date"
                value={startDate}
              />
            </label>
            {!isAllDay ? (
              <label className="grid gap-1">
                <span className="px-1 text-xs text-muted-foreground">Time</span>
                <input
                  className="event-form-input min-h-10 rounded-[14px] border border-input bg-white px-3 py-2 text-sm"
                  onChange={(event) => handleStartTimeChange(event.target.value)}
                  placeholder="Time"
                  type="time"
                  value={startTime}
                />
              </label>
            ) : null}
          </div>
        </div>
        <div className="grid gap-2">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">End</p>
          <div className={`grid gap-2.5 ${isAllDay ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]"}`}>
            <label className="grid gap-1">
              <span className="px-1 text-xs text-muted-foreground">Date</span>
              <input
                className="event-form-input min-h-10 rounded-[14px] border border-input bg-white px-3 py-2 text-sm"
                onChange={(event) => setEndDate(event.target.value)}
                type="date"
                value={endDate}
              />
            </label>
            {!isAllDay ? (
              <label className="grid gap-1">
                <span className="px-1 text-xs text-muted-foreground">Time</span>
                <input
                  className="event-form-input min-h-10 rounded-[14px] border border-input bg-white px-3 py-2 text-sm"
                  onChange={(event) => setEndTime(event.target.value)}
                  placeholder="Time"
                  type="time"
                  value={endTime}
                />
              </label>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

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
              {renderDateTimeFields()}
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
                  <button
                    className="event-form-input inline-flex min-h-11 items-center justify-center rounded-[14px] border border-border/80 bg-white px-4 text-sm font-semibold text-foreground"
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
                  onClick={resetForm}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-[16px] bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? <LoaderCircle className="size-5 animate-spin" /> : "Publish event"}
                </button>
              </div>
            </form>
          ) : null}

          {feedback ? <p className="mb-0 mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
        </div>
      ) : null}

      {selectedMonth ? (
        <div className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-2">
          <div className="flex justify-start">
            <button
              aria-label="Previous month"
              className="inline-flex size-8 items-center justify-center bg-transparent text-foreground disabled:opacity-35"
              disabled={!canGoPreviousMonth}
              onClick={() => setSelectedMonthIndex((current) => Math.max(0, current - 1))}
              type="button"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="ui-text py-1 text-center font-sans font-semibold text-foreground">{selectedMonth.label}</div>
            {hasPastEventsInSelectedMonth ? (
              <button
                aria-label={arePastEventsCollapsed ? "Expand past events" : "Collapse past events"}
                className="inline-flex size-8 items-center justify-center bg-transparent text-foreground"
                onClick={() => setArePastEventsCollapsed((current) => !current)}
                type="button"
              >
                <ChevronDown className={`size-4 transition-transform ${arePastEventsCollapsed ? "rotate-0" : "rotate-180"}`} />
              </button>
            ) : null}
          </div>
          <div className="flex justify-end">
            <button
              aria-label="Next month"
              className="inline-flex size-8 items-center justify-center bg-transparent text-foreground disabled:opacity-35"
              disabled={!canGoNextMonth}
              onClick={() => setSelectedMonthIndex((current) => Math.min(monthGroups.length - 1, current + 1))}
              type="button"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      {visibleEvents.map((item, index) => {
        const eventItem = item.event;
        const isPast = isPastEvent(eventItem);
        const isHiddenPastEvent = isCurrentMonthView && isPast && arePastEventsCollapsed && editingEventId !== eventItem.id;
        const displayedMonthKey = item.monthKey;
        const startMonthKey = getMonthKey(eventItem.startsAt);
        const endDateValue = eventItem.endsAt ?? eventItem.startsAt;
        const endMonthKey = getMonthKey(endDateValue);
        const startDisplayValue = displayedMonthKey === startMonthKey ? getDayNumber(eventItem.startsAt) : getNumericMonthDay(eventItem.startsAt);
        const endDisplayValue = displayedMonthKey === endMonthKey ? getDayNumber(endDateValue) : getNumericMonthDay(endDateValue);
        if (isHiddenPastEvent) {
          return null;
        }

        return (
        <article
          key={`${eventItem.id}-${item.monthKey}-${index}`}
          id={`event-${eventItem.id}`}
          className={`event-surface relative isolate scroll-mt-6 rounded-[18px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,254,251,0.96),rgba(255,252,247,0.9))] px-4 pt-4 shadow-[0_8px_20px_rgba(68,52,35,0.045),0_18px_40px_rgba(68,52,35,0.055)] ${eventItem.imageUrl ? "pb-0" : "pb-4"} ${openMenuEventId === eventItem.id ? "z-[80] overflow-visible" : "z-0 overflow-hidden"}`}
        >
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
            {canManage && editingEventId !== eventItem.id ? (
            <div ref={openMenuEventId === eventItem.id ? menuAreaRef : null} className="relative">
              <div className="relative">
                <button
                  aria-label="Event actions"
                  className="inline-flex size-10 items-center justify-center bg-transparent text-foreground"
                  onClick={() => setOpenMenuEventId((current) => (current === eventItem.id ? null : eventItem.id))}
                  type="button"
                >
                  <MoreVertical className="size-4" />
                </button>
                {openMenuEventId === eventItem.id ? (
                  <div className="absolute right-0 top-[calc(100%+0.25rem)] z-[90] min-w-[148px] overflow-hidden rounded-[14px] border border-border bg-white dark:bg-[var(--card)] shadow-[0_4px_12px_rgba(68,52,35,0.08)]">
                    <button
                      className="flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold text-foreground"
                      onClick={() => beginEdit(eventItem)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold text-foreground disabled:opacity-60"
                      disabled={isDeletingId === eventItem.id}
                      onClick={() => deleteEvent(eventItem.id)}
                      type="button"
                    >
                      {isDeletingId === eventItem.id ? <LoaderCircle className="size-4 animate-spin" /> : "Delete"}
                    </button>
                    <button
                      className="flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold text-foreground disabled:opacity-60"
                      disabled={isDuplicatingId === eventItem.id}
                      onClick={() => duplicateEvent(eventItem)}
                      type="button"
                    >
                      {isDuplicatingId === eventItem.id ? <LoaderCircle className="size-4 animate-spin" /> : "Duplicate"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          </div>

          <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4">
            <div className="flex flex-col items-center justify-start pt-1 text-center">
              {hasDifferentStartAndEndDate(eventItem) ? (
                <>
                  <p className={`m-0 font-sans font-semibold leading-none text-foreground ${startDisplayValue.includes("/") ? "text-[1.45rem]" : "text-[2rem]"}`}>{startDisplayValue}</p>
                  <p className="mt-1 mb-0 text-sm font-medium uppercase tracking-[0.06em] text-muted-foreground">{formatEasternWeekday(eventItem.startsAt)}</p>
                  <p className="my-1 text-sm font-medium text-muted-foreground">|</p>
                  <p className={`m-0 font-sans font-semibold leading-none text-foreground ${endDisplayValue.includes("/") ? "text-[1.45rem]" : "text-[2rem]"}`}>{endDisplayValue}</p>
                  <p className="mt-1 mb-0 text-sm font-medium uppercase tracking-[0.06em] text-muted-foreground">{formatEasternWeekday(endDateValue)}</p>
                </>
              ) : (
                <>
                  <p className={`m-0 font-sans font-semibold leading-none text-foreground ${startDisplayValue.includes("/") ? "text-[1.45rem]" : "text-[2rem]"}`}>{startDisplayValue}</p>
                  <p className="mt-1 mb-0 text-sm font-medium uppercase tracking-[0.06em] text-muted-foreground">{formatEasternWeekday(eventItem.startsAt)}</p>
                </>
              )}
            </div>

            <div className="min-w-0 overflow-hidden">
              {editingEventId === eventItem.id ? (
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
                  {renderDateTimeFields()}
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
                  <h2 className="ui-text m-0 min-w-0 pr-10 font-sans font-semibold leading-tight text-foreground">
                    {eventItem.title}
                  </h2>
                  <div className="mt-2 space-y-2 text-muted-foreground">
                    <p className="ui-text m-0 flex items-center gap-2">
                      <CalendarDays className="size-4 shrink-0 text-current" />
                      <span>{isAllDayEvent(eventItem) ? formatEasternEventDate(eventItem.startsAt) : `${formatEasternEventDate(eventItem.startsAt)} · ${formatEasternEventTime(eventItem.startsAt)}`}</span>
                    </p>
                    {eventItem.endsAt && (isAllDayEvent(eventItem) ? hasDifferentStartAndEndDate(eventItem) : true) ? (
                      <p className="ui-text m-0 flex items-center gap-2">
                        <CalendarDays className="size-4 shrink-0 text-current" />
                        <span>{isAllDayEvent(eventItem) ? formatEasternEventDate(eventItem.endsAt) : `${formatEasternEventDate(eventItem.endsAt)} · ${formatEasternEventTime(eventItem.endsAt)}`}</span>
                      </p>
                    ) : null}
                  </div>
                  {eventItem.locationName ? (
                    <p className="ui-text mt-2 mb-0 flex items-center gap-2 text-muted-foreground">
                      <MapPin className="size-4 shrink-0 text-current" />
                      <span>{eventItem.locationName}</span>
                    </p>
                  ) : null}
                  {eventItem.summary ? <p className="ui-text mt-3 mb-0 text-muted-foreground">{eventItem.summary}</p> : null}
                </>
              )}
            </div>
          </div>

          {eventItem.imageUrl ? (
            <div className="mt-4 -mx-4">
              {eventItem.isLiveStream && eventItem.liveStreamUrl ? (
                <a href={eventItem.liveStreamUrl} rel="noreferrer" target="_blank">
                  <img alt={eventItem.title} className="block w-full rounded-b-[18px]" src={eventItem.imageUrl} />
                </a>
              ) : (
                <img alt={eventItem.title} className="block w-full rounded-b-[18px]" src={eventItem.imageUrl} />
              )}
            </div>
          ) : null}
        </article>
      );})}
    </section>
  );
}
