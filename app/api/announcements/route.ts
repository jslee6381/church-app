import { NextResponse } from "next/server";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { uploadPublicImage } from "@/lib/storage";
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
      return NextResponse.json({ error: "Only leaders and admins can post announcements." }, { status: 403 });
    }

    const formData = await request.formData();
    const title = normalizeText(String(formData.get("title") ?? ""));
    const body = normalizeText(String(formData.get("body") ?? ""));
    const image = formData.get("image");

    if (!title || !body) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
    }

    if (title.length > TITLE_LIMIT) {
      return NextResponse.json({ error: `Please keep the title under ${TITLE_LIMIT} characters.` }, { status: 400 });
    }

    if (body.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the content under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        announcement: {
          id: crypto.randomUUID(),
          title,
          body,
          image_url: null,
        },
      });
    }

    let imageUrl: string | null = null;

    if (image instanceof File && image.size > 0) {
      imageUrl = await uploadPublicImage(image, "community-updates");
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await admin
      .from("announcements")
      .insert({
        church_id: session.member.church_id,
        title,
        summary: null,
        body,
        image_url: imageUrl,
        visibility: "members",
        is_pinned: false,
        published_at: now,
        author_member_id: session.member.id,
      })
      .select("id, title, body, image_url")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to create announcement." }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "announcements",
      action: "create",
      metadata: {
        announcementId: data.id,
      },
    });

    return NextResponse.json({
      success: true,
      announcement: data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create announcement." },
      { status: 500 },
    );
  }
}
