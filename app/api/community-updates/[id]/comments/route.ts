import { NextResponse } from "next/server";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

const CONTENT_LIMIT = 150;

function normalizeText(value: string) {
  return value.trim().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

function formatEasternLongDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session || session.member.status !== "active") {
      return NextResponse.json({ error: "Only approved members can comment." }, { status: 403 });
    }

    const { message } = (await request.json()) as { message?: string };
    const normalizedMessage = normalizeText(message ?? "");

    if (!normalizedMessage) {
      return NextResponse.json({ error: "Please write a comment." }, { status: 400 });
    }

    if (normalizedMessage.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the content under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        comment: {
          id: crypto.randomUUID(),
          authorName: session.member.display_name ?? session.member.full_name,
          authorPhotoUrl: null,
          message: normalizedMessage,
          createdAtLabel: formatEasternLongDate(new Date()),
          reactionCounts: { heart: 0, like: 0 },
          selectedReaction: null,
          isOwner: true,
        },
      });
    }

    const { id } = await context.params;
    const admin = createAdminClient();
    const { data: existingUpdate } = await admin
      .from("community_updates")
      .select("id")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .eq("status", "approved")
      .maybeSingle();

    if (!existingUpdate) {
      return NextResponse.json({ error: "Community update not found." }, { status: 404 });
    }

    const { data: inserted, error } = await admin
      .from("community_update_comments")
      .insert({
        community_update_id: id,
        author_member_id: session.member.id,
        message: normalizedMessage,
      })
      .select("id, message, created_at")
      .single();

    if (error || !inserted) {
      return NextResponse.json({ error: error?.message ?? "Unable to post comment." }, { status: 500 });
    }

    const { data: profileRow } = await admin
      .from("members")
      .select("profiles!left(profile_photo_url)")
      .eq("id", session.member.id)
      .maybeSingle();

    const profile = profileRow ? (Array.isArray(profileRow.profiles) ? profileRow.profiles[0] : profileRow.profiles) : null;

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "community_update_comments",
      entity_id: inserted.id,
      action: "create",
      metadata: {
        communityUpdateId: id,
      },
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: inserted.id,
        authorName: session.member.display_name ?? session.member.full_name,
        authorPhotoUrl: profile?.profile_photo_url ?? null,
        message: inserted.message,
        createdAtLabel: formatEasternLongDate(inserted.created_at),
        reactionCounts: { heart: 0, like: 0 },
        selectedReaction: null,
        isOwner: true,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to post comment." }, { status: 500 });
  }
}
