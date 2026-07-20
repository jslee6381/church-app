import { NextResponse } from "next/server";
import { requireAdminOrLeaderSession } from "@/lib/auth/authorization";
import { uploadPublicImage } from "@/lib/storage";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { DEFAULT_LIVE_STREAM_URL } from "@/lib/events";

function normalizeText(value: string) {
  return value.trim();
}

const TITLE_LIMIT = 50;
const CONTENT_LIMIT = 150;

export async function POST(request: Request) {
  try {
    const session = await requireAdminOrLeaderSession();
    const formData = await request.formData();

    const title = normalizeText(String(formData.get("title") ?? ""));
    const summary = normalizeText(String(formData.get("summary") ?? ""));
    const locationName = normalizeText(String(formData.get("locationName") ?? ""));
    const startsAt = normalizeText(String(formData.get("startsAt") ?? ""));
    const isLiveStream = String(formData.get("isLiveStream") ?? "") === "true";
    const image = formData.get("image");

    if (!startsAt) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }

    if (title.length > TITLE_LIMIT) {
      return NextResponse.json({ error: `Please keep the title under ${TITLE_LIMIT} characters.` }, { status: 400 });
    }

    if (summary.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the content under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    let imageUrl: string | null = null;

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        event: {
          id: `demo-${Date.now()}`,
          title,
          summary,
          location_name: locationName,
          starts_at: startsAt,
          image_url: null,
          is_live_stream: isLiveStream,
          live_stream_url: isLiveStream ? DEFAULT_LIVE_STREAM_URL : null,
        },
      });
    }

    if (image instanceof File && image.size > 0) {
      imageUrl = await uploadPublicImage(image, "events");
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("events")
      .insert({
        church_id: session.member.church_id,
        title,
        summary: summary || null,
        description: summary || null,
        location_name: locationName || null,
        starts_at: new Date(startsAt).toISOString(),
        image_url: imageUrl,
        is_live_stream: isLiveStream,
        live_stream_url: isLiveStream ? DEFAULT_LIVE_STREAM_URL : null,
        visibility: "members",
        published_at: new Date().toISOString(),
        published_by_member_id: session.member.id,
      })
      .select("id, title, summary, location_name, starts_at, image_url, is_live_stream, live_stream_url")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to create event." }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "events",
      entity_id: data.id,
      action: "create",
      metadata: {
        startsAt: data.starts_at,
        isLiveStream: data.is_live_stream,
      },
    });

    return NextResponse.json({
      success: true,
      event: data,
    });
  } catch {
    return NextResponse.json({ error: "Unable to create event." }, { status: 500 });
  }
}
