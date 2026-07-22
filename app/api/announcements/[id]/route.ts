import { NextResponse } from "next/server";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { removePublicImage, uploadPublicImage } from "@/lib/storage";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

const TITLE_LIMIT = 50;
const CONTENT_LIMIT = 150;

function normalizeText(value: string) {
  return value.trim().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
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
      return NextResponse.json({ error: "Only leaders and admins can edit announcements." }, { status: 403 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const title = normalizeText(String(formData.get("title") ?? ""));
    const body = normalizeText(String(formData.get("body") ?? ""));
    const removeImage = String(formData.get("removeImage") ?? "") === "true";
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
          id,
          title,
          body,
          image_url: null,
        },
      });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("announcements")
      .select("id, image_url")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
    }

    let nextImageUrl = existing.image_url ?? null;

    if (image instanceof File && image.size > 0) {
      nextImageUrl = await uploadPublicImage(image, "community-updates");
    } else if (removeImage) {
      nextImageUrl = null;
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from("announcements")
      .update({
        title,
        summary: null,
        body,
        image_url: nextImageUrl,
        published_at: now,
      })
      .eq("id", id)
      .select("id, title, body, image_url")
      .single();

    if (error || !data) {
      if (nextImageUrl && nextImageUrl !== existing.image_url) {
        await removePublicImage(nextImageUrl);
      }

      return NextResponse.json({ error: error?.message ?? "Unable to update announcement." }, { status: 500 });
    }

    if ((removeImage || image instanceof File) && existing.image_url && existing.image_url !== nextImageUrl) {
      await removePublicImage(existing.image_url);
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "announcements",
      action: "update",
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
      { error: error instanceof Error ? error.message : "Unable to update announcement." },
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
      return NextResponse.json({ error: "Only leaders and admins can delete announcements." }, { status: 403 });
    }

    const { id } = await params;

    if (!hasAdminEnvironment()) {
      return NextResponse.json({ success: true });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("announcements")
      .select("id, image_url")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
    }

    const { error } = await admin.from("announcements").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (existing.image_url) {
      await removePublicImage(existing.image_url);
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "announcements",
      action: "delete",
      metadata: {
        announcementId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete announcement." },
      { status: 500 },
    );
  }
}
