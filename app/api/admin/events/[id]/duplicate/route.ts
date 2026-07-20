import { NextResponse } from "next/server";
import { requireAdminOrLeaderSession } from "@/lib/auth/authorization";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { DEFAULT_LIVE_STREAM_URL } from "@/lib/events";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminOrLeaderSession();
    const { id } = await params;

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        event: {
          id: `demo-${Date.now()}`,
          title: "Duplicated event",
          summary: "",
          location_name: null,
          starts_at: new Date().toISOString(),
          image_url: null,
          is_live_stream: false,
          live_stream_url: null,
        },
      });
    }

    const admin = createAdminClient();
    const { data: sourceEvent, error: sourceError } = await admin
      .from("events")
      .select("title, summary, description, location_name, starts_at, image_url, is_live_stream, live_stream_url, visibility")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .single();

    if (sourceError || !sourceEvent) {
      return NextResponse.json({ error: sourceError?.message ?? "Unable to find event." }, { status: 404 });
    }

    const { data: duplicatedEvent, error: insertError } = await admin
      .from("events")
      .insert({
        church_id: session.member.church_id,
        title: sourceEvent.title,
        summary: sourceEvent.summary,
        description: sourceEvent.description,
        location_name: sourceEvent.location_name,
        starts_at: sourceEvent.starts_at,
        image_url: sourceEvent.image_url,
        is_live_stream: sourceEvent.is_live_stream ?? false,
        live_stream_url: sourceEvent.is_live_stream ? sourceEvent.live_stream_url ?? DEFAULT_LIVE_STREAM_URL : null,
        visibility: sourceEvent.visibility ?? "members",
        published_at: new Date().toISOString(),
        published_by_member_id: session.member.id,
      })
      .select("id, title, summary, location_name, starts_at, image_url, is_live_stream, live_stream_url")
      .single();

    if (insertError || !duplicatedEvent) {
      return NextResponse.json({ error: insertError?.message ?? "Unable to duplicate event." }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "events",
      entity_id: duplicatedEvent.id,
      action: "duplicate",
      metadata: {
        sourceEventId: id,
        startsAt: duplicatedEvent.starts_at,
        isLiveStream: duplicatedEvent.is_live_stream,
      },
    });

    return NextResponse.json({
      success: true,
      event: duplicatedEvent,
    });
  } catch {
    return NextResponse.json({ error: "Unable to duplicate event." }, { status: 500 });
  }
}
