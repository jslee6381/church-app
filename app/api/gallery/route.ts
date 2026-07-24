import { NextResponse } from "next/server";

import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getEmbeddedGoogleDriveFolderUrl } from "@/lib/google-drive-public";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

const TITLE_LIMIT = 50;
const CONTENT_LIMIT = 150;

function normalizeText(value: string) {
  return value.trim().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

export async function POST(request: Request) {
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
      return NextResponse.json({ error: "Only leaders and admins can post gallery links." }, { status: 403 });
    }

    const payload = (await request.json()) as {
      title?: string;
      body?: string;
      driveLink?: string;
    };

    const title = normalizeText(String(payload.title ?? ""));
    const body = normalizeText(String(payload.body ?? ""));
    const driveLink = String(payload.driveLink ?? "").trim();
    const embedUrl = getEmbeddedGoogleDriveFolderUrl(driveLink, "grid");

    if (!title || !driveLink) {
      return NextResponse.json({ error: "Title and Google Drive link are required." }, { status: 400 });
    }

    if (!embedUrl) {
      return NextResponse.json({ error: "Please use a valid Google Drive folder link." }, { status: 400 });
    }

    if (title.length > TITLE_LIMIT) {
      return NextResponse.json({ error: `Please keep the title under ${TITLE_LIMIT} characters.` }, { status: 400 });
    }

    if (body.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the description under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      const now = new Date().toISOString();
      return NextResponse.json({
        success: true,
        post: {
          id: crypto.randomUUID(),
          title,
          body: body || null,
          drive_link: driveLink,
          embed_url: embedUrl,
          created_at: now,
        },
      });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("gallery_posts")
      .insert({
        church_id: session.member.church_id,
        author_member_id: session.member.id,
        title,
        body: body || null,
        drive_link: driveLink,
      })
      .select("id, title, body, drive_link, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to create gallery post." }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "gallery_posts",
      action: "create",
      metadata: {
        galleryPostId: data.id,
      },
    });

    return NextResponse.json({
      success: true,
      post: {
        ...data,
        embed_url: embedUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create gallery post." },
      { status: 500 },
    );
  }
}
