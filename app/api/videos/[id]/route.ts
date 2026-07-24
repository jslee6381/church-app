import { NextResponse } from "next/server";

import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { getYouTubeThumbnailUrl, getYouTubeWatchUrl } from "@/lib/youtube";

const TITLE_LIMIT = 50;
const CONTENT_LIMIT = 150;

function normalizeText(value: string) {
  return value.trim().replace(/\s+
/g, "
").replace(/
{3,}/g, "

");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 });
    }

    if (session.member.status !== "active") {
      return NextResponse.json({ error: "Your member access is still awaiting approval." }, { status: 403 });
    }

    const roles = await getMemberRoles(session.member.id);
    const canCompose = roles.includes("admin") || roles.includes("leader");

    if (!canCompose) {
      return NextResponse.json({ error: "Only leaders and admins can edit videos." }, { status: 403 });
    }

    const { id } = await params;
    const payload = (await request.json()) as {
      title?: string;
      body?: string;
      videoLink?: string;
    };

    const title = normalizeText(String(payload.title ?? ""));
    const body = normalizeText(String(payload.body ?? ""));
    const videoLink = String(payload.videoLink ?? "").trim();
    const thumbnailUrl = getYouTubeThumbnailUrl(videoLink);
    const watchUrl = getYouTubeWatchUrl(videoLink);

    if (!title || !videoLink) {
      return NextResponse.json({ error: "Title and YouTube link are required." }, { status: 400 });
    }

    if (!thumbnailUrl || !watchUrl) {
      return NextResponse.json({ error: "Please use a valid YouTube link." }, { status: 400 });
    }

    if (title.length > TITLE_LIMIT) {
      return NextResponse.json({ error: `Please keep the title under ${TITLE_LIMIT} characters.` }, { status: 400 });
    }

    if (body.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the description under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        post: {
          id,
          title,
          body: body || null,
          video_link: videoLink,
          thumbnail_url: thumbnailUrl,
          watch_url: watchUrl,
          created_at: new Date().toISOString(),
        },
      });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("video_posts")
      .select("id")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Video post not found." }, { status: 404 });
    }

    const { data, error } = await admin
      .from("video_posts")
      .update({
        title,
        body: body || null,
        video_link: videoLink,
      })
      .eq("id", id)
      .select("id, title, body, video_link, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to update video post." }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "video_posts",
      action: "update",
      metadata: {
        videoPostId: data.id,
      },
    });

    return NextResponse.json({
      success: true,
      post: {
        ...data,
        thumbnail_url: thumbnailUrl,
        watch_url: watchUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update video post." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 });
    }

    if (session.member.status !== "active") {
      return NextResponse.json({ error: "Your member access is still awaiting approval." }, { status: 403 });
    }

    const roles = await getMemberRoles(session.member.id);
    const canCompose = roles.includes("admin") || roles.includes("leader");

    if (!canCompose) {
      return NextResponse.json({ error: "Only leaders and admins can delete videos." }, { status: 403 });
    }

    const { id } = await params;

    if (!hasAdminEnvironment()) {
      return NextResponse.json({ success: true });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("video_posts")
      .select("id")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Video post not found." }, { status: 404 });
    }

    const { error } = await admin.from("video_posts").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "video_posts",
      action: "delete",
      metadata: {
        videoPostId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete video post." },
      { status: 500 },
    );
  }
}
