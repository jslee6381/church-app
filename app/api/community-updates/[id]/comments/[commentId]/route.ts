import { NextResponse } from "next/server";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

const CONTENT_LIMIT = 150;

function normalizeText(value: string) {
  return value.trim().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();
    if (!session || session.member.status !== "active") {
      return NextResponse.json({ error: "Only approved members can edit comments." }, { status: 403 });
    }

    const { message } = (await request.json()) as { message?: string };
    const normalizedMessage = normalizeText(message ?? "");
    if (!normalizedMessage) {
      return NextResponse.json({ error: "Please write a comment." }, { status: 400 });
    }
    if (normalizedMessage.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the content under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    const { id, commentId } = await context.params;
    const roles = await getMemberRoles(session.member.id);
    const canManageAll = roles.includes("admin") || roles.includes("leader");

    if (!hasAdminEnvironment()) {
      return NextResponse.json({ success: true, comment: { id: commentId, message: normalizedMessage } });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("community_update_comments")
      .select("id, author_member_id, community_update_id")
      .eq("id", commentId)
      .eq("community_update_id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    if (!canManageAll && existing.author_member_id !== session.member.id) {
      return NextResponse.json({ error: "You can only edit your own comments." }, { status: 403 });
    }

    const { data, error } = await admin
      .from("community_update_comments")
      .update({ message: normalizedMessage })
      .eq("id", commentId)
      .select("id, message")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to update comment." }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment: data });
  } catch {
    return NextResponse.json({ error: "Unable to update comment." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();
    if (!session || session.member.status !== "active") {
      return NextResponse.json({ error: "Only approved members can delete comments." }, { status: 403 });
    }

    const { id, commentId } = await context.params;
    const roles = await getMemberRoles(session.member.id);
    const canManageAll = roles.includes("admin") || roles.includes("leader");

    if (!hasAdminEnvironment()) {
      return NextResponse.json({ success: true });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("community_update_comments")
      .select("id, author_member_id, community_update_id")
      .eq("id", commentId)
      .eq("community_update_id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    if (!canManageAll && existing.author_member_id !== session.member.id) {
      return NextResponse.json({ error: "You can only delete your own comments." }, { status: 403 });
    }

    const { error } = await admin.from("community_update_comments").delete().eq("id", commentId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete comment." }, { status: 500 });
  }
}
