import "server-only";
import { hasAdminEnvironment } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEasternEventDate, formatEasternEventTime, formatEasternMonthHeading } from "@/lib/eastern-time";

export const DEFAULT_LIVE_STREAM_URL = "https://www.youtube.com/@nyubfsundayworship260/streams";

export type EventListItem = {
  id: string;
  title: string;
  summary: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  locationName: string | null;
  locationAddress: string | null;
  category?: string;
  posterSrc?: string;
  posterAlt?: string;
  isLiveStream?: boolean;
  liveStreamUrl?: string | null;
  variant?: "featured" | "service-pair" | "united-service";
  services?: Array<{ title: string; time?: string; startsAt?: string }>;
  imageUrl?: string | null;
};

export type EventCarouselItem = {
  item: EventListItem | null;
  hasPrevious: boolean;
  hasNext: boolean;
  index: number;
};

type EventRow = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location_name: string | null;
  location_address: string | null;
  image_url: string | null;
  is_live_stream: boolean | null;
  live_stream_url: string | null;
};

export type EventRsvpStatus = "going" | "maybe" | "not_going";

export function formatEventDate(date: string) {
  return formatEasternEventDate(date);
}

export function formatEventTime(date: string) {
  return formatEasternEventTime(date);
}

export function formatMonthHeading(date: string) {
  return formatEasternMonthHeading(date);
}

function mapEventRow(event: EventRow): EventListItem {
  return {
    id: event.id,
    title: event.title,
    summary: event.summary ?? "",
    description: event.description ?? "",
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    locationName: event.location_name,
    locationAddress: event.location_address,
    imageUrl: event.image_url ?? null,
    isLiveStream: event.is_live_stream ?? false,
    liveStreamUrl: event.live_stream_url ?? null,
  };
}

function getEventEndReference(event: Pick<EventRow, "starts_at" | "ends_at">) {
  return new Date(event.ends_at ?? event.starts_at).getTime();
}

async function getAllEvents(churchId?: string | null): Promise<EventListItem[]> {
  if (!hasAdminEnvironment() || !churchId) {
    return [];
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("events")
      .select("id, title, summary, description, starts_at, ends_at, location_name, location_address, image_url, is_live_stream, live_stream_url")
      .eq("church_id", churchId)
      .order("starts_at", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(500);

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((event) => mapEventRow(event as EventRow));
  } catch {
    return [];
  }
}

export async function getUpcomingEvents(churchId?: string | null): Promise<EventListItem[]> {
  const allEvents = await getAllEvents(churchId);
  const now = Date.now();

  return allEvents.filter((event) => getEventEndReference({ starts_at: event.startsAt, ends_at: event.endsAt }) >= now);
}

export async function getUpcomingEventCarouselItem(
  churchId?: string | null,
  index = 0,
): Promise<EventCarouselItem> {
  if (!hasAdminEnvironment() || !churchId) {
    return {
      item: null,
      hasPrevious: false,
      hasNext: false,
      index: 0,
    };
  }

  const safeIndex = Math.max(0, Number.isFinite(index) ? Math.trunc(index) : 0);

  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const { data, error, count } = await admin
      .from("events")
      .select("id, title, summary, description, starts_at, ends_at, location_name, location_address, image_url, is_live_stream, live_stream_url", { count: "exact" })
      .eq("church_id", churchId)
      .or(`ends_at.gte.${nowIso},and(ends_at.is.null,starts_at.gte.${nowIso})`)
      .order("starts_at", { ascending: true })
      .order("created_at", { ascending: true })
      .range(safeIndex, safeIndex);

    const total = count ?? 0;
    const item = !error && data && data.length > 0 ? mapEventRow(data[0] as EventRow) : null;

    return {
      item,
      hasPrevious: safeIndex > 0 && total > 0,
      hasNext: total > safeIndex + 1,
      index: safeIndex,
    };
  } catch {
    return {
      item: null,
      hasPrevious: false,
      hasNext: false,
      index: safeIndex,
    };
  }
}

export async function getEventsForBoard(churchId?: string | null): Promise<EventListItem[]> {
  return getAllEvents(churchId);
}

export async function getEventById(churchId: string | null | undefined, eventId: string): Promise<EventListItem | null> {
  if (!hasAdminEnvironment() || !churchId) {
    return null;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("events")
      .select("id, title, summary, description, starts_at, ends_at, location_name, location_address, image_url, is_live_stream, live_stream_url")
      .eq("church_id", churchId)
      .eq("id", eventId)
      .single();

    if (error || !data) {
      return null;
    }

    return mapEventRow(data as EventRow);
  } catch {
    return null;
  }
}

export async function getEventRsvp(eventId: string, memberId: string) {
  if (!hasAdminEnvironment()) {
    return null;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("event_rsvps")
      .select("status")
      .eq("event_id", eventId)
      .eq("member_id", memberId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.status as EventRsvpStatus;
  } catch {
    return null;
  }
}
