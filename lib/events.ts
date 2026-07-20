import "server-only";
import { sampleEvents, type SampleEvent } from "@/lib/data";
import { hasAdminEnvironment } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_LIVE_STREAM_URL = "https://www.youtube.com/@nyubfsundayworship260/streams";

export type EventListItem = SampleEvent & {
  isFallback?: boolean;
  imageUrl?: string | null;
};

export type EventRsvpStatus = "going" | "maybe" | "not_going";

export function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatEventTime(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
    .format(new Date(date))
    .replace(":00 ", "")
    .replace(" ", "");
}

export function formatMonthHeading(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
  }).format(new Date(date));
}

function mapSampleEvents(): EventListItem[] {
  return sampleEvents.map((event) => ({
    ...event,
    isFallback: true,
  }));
}

export async function getUpcomingEvents(churchId?: string | null): Promise<EventListItem[]> {
  if (!hasAdminEnvironment() || !churchId) {
    return mapSampleEvents();
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("events")
      .select("id, title, summary, description, starts_at, ends_at, location_name, location_address, image_url, is_live_stream, live_stream_url")
      .eq("church_id", churchId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(30);

    if (error || !data || data.length === 0) {
      return mapSampleEvents();
    }

    return data.map((event) => ({
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
    }));
  } catch {
    return mapSampleEvents();
  }
}

export async function getEventById(churchId: string | null | undefined, eventId: string): Promise<EventListItem | null> {
  if (!hasAdminEnvironment() || !churchId) {
    return mapSampleEvents().find((event) => event.id === eventId) ?? null;
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
      return mapSampleEvents().find((event) => event.id === eventId) ?? null;
    }

    return {
      id: data.id,
      title: data.title,
      summary: data.summary ?? "",
      description: data.description ?? "",
      startsAt: data.starts_at,
      endsAt: data.ends_at,
      locationName: data.location_name,
      locationAddress: data.location_address,
      imageUrl: data.image_url ?? null,
      isLiveStream: data.is_live_stream ?? false,
      liveStreamUrl: data.live_stream_url ?? null,
    };
  } catch {
    return mapSampleEvents().find((event) => event.id === eventId) ?? null;
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
