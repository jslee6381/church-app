import { NextResponse } from "next/server";
import { requireAdminOrLeaderSession } from "@/lib/auth/authorization";
import { sampleEvents } from "@/lib/data";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const session = await requireAdminOrLeaderSession();

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        importedCount: sampleEvents.length,
      });
    }

    const admin = createAdminClient();
    const sampleStartsAt = sampleEvents.map((event) => new Date(event.startsAt).toISOString());

    const { data: existingEvents, error: existingError } = await admin
      .from("events")
      .select("title, starts_at")
      .eq("church_id", session.member.church_id)
      .in("starts_at", sampleStartsAt);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const existingKeys = new Set(
      (existingEvents ?? []).map((event) => `${event.title}::${new Date(event.starts_at).toISOString()}`),
    );

    const rowsToInsert = sampleEvents
      .filter((event) => !existingKeys.has(`${event.title}::${new Date(event.startsAt).toISOString()}`))
      .map((event) => ({
        church_id: session.member.church_id,
        title: event.title,
        summary: event.summary || null,
        description: event.description || null,
        location_name: event.locationName || null,
        location_address: event.locationAddress || null,
        starts_at: new Date(event.startsAt).toISOString(),
        ends_at: event.endsAt ? new Date(event.endsAt).toISOString() : null,
        image_url: event.posterSrc ?? null,
        visibility: "members" as const,
        is_live_stream: event.isLiveStream ?? false,
        live_stream_url: event.liveStreamUrl ?? null,
        published_at: new Date().toISOString(),
        published_by_member_id: session.member.id,
      }));

    if (rowsToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        importedCount: 0,
      });
    }

    const { error: insertError } = await admin.from("events").insert(rowsToInsert);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      importedCount: rowsToInsert.length,
    });
  } catch {
    return NextResponse.json({ error: "Unable to import events." }, { status: 500 });
  }
}
