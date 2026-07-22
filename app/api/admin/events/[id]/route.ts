import { NextResponse } from "next/server";
import { requireAdminOrLeaderSession } from "@/lib/auth/authorization";
import { removePublicImage, uploadPublicImage } from "@/lib/storage";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { DEFAULT_LIVE_STREAM_URL } from "@/lib/events";
import { easternLocalDateTimeToIso } from "@/lib/eastern-time";

function normalizeText(value: string) {
  return value.trim();
}

const TITLE_LIMIT = 50;
const CONTENT_LIMIT = 150;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminOrLeaderSession();
    const { id } = await params;
    const formData = await request.formData();

    const title = normalizeText(String(formData.get("title") ?? ""));
    const summary = normalizeText(String(formData.get("summary") ?? ""));
    const locationName = normalizeText(String(formData.get("locationName") ?? ""));
    const startsAt = normalizeText(String(formData.get("startsAt") ?? ""));
    const isLiveStream = String(formData.get("isLiveStream") ?? "") === "true";
    const removeImage = String(formData.get("removeImage") ?? "") === "true";
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

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        event: {
          id,
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

    const admin = createAdminClient();
    const { data: existingEvent } = await admin
      .from("events")
      .select("image_url")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    const updates: {
      title: string;
      summary: string | null;
      description: string | null;
      location_name: string | null;
      starts_at: string;
      is_live_stream: boolean;
      live_stream_url: string | null;
      image_url?: string | null;
    } = {
      title,
      summary: summary || null,
      description: summary || null,
      location_name: locationName || null,
      starts_at: easternLocalDateTimeToIso(startsAt),
      is_live_stream: isLiveStream,
      live_stream_url: isLiveStream ? DEFAULT_LIVE_STREAM_URL : null,
    };

    if (removeImage) {
      updates.image_url = null;
    }

    if (image instanceof File && image.size > 0) {
      updates.image_url = await uploadPublicImage(image, "events");
    }

    const { data, error } = await admin
      .from("events")
      .update(updates)
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .select("id, title, summary, location_name, starts_at, image_url, is_live_stream, live_stream_url")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to update event." }, { status: 500 });
    }

    const previousImageUrl = existingEvent?.image_url ?? null;
    const nextImageUrl = data.image_url ?? null;

    if (previousImageUrl && previousImageUrl !== nextImageUrl && hasAdminEnvironment()) {
      await removePublicImage(previousImageUrl);
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "events",
      entity_id: data.id,
      action: "update",
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
    return NextResponse.json({ error: "Unable to update event." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminOrLeaderSession();
    const { id } = await params;

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        message: "Event deleted.",
      });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("events")
      .delete()
      .eq("id", id)
      .eq("church_id", session.member.church_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "events",
      entity_id: id,
      action: "delete",
      metadata: {},
    });

    return NextResponse.json({
      success: true,
      message: "Event deleted.",
    });
  } catch {
    return NextResponse.json({ error: "Unable to delete event." }, { status: 500 });
  }
}
