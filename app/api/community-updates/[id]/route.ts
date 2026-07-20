import { NextResponse } from "next/server";
import { canSelfApproveByRole, getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

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

    const { id } = await params;
    const { summary } = (await request.json()) as { summary?: string };
    const normalizedSummary = normalizeText(summary ?? "");
    const roles = await getMemberRoles(session.member.id);
    const canBypassApproval = canSelfApproveByRole(roles);

    if (normalizedSummary.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the content under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        message: canBypassApproval ? "Your update was published." : "Your update was saved and sent for approval.",
        update: {
          id,
          summary: normalizedSummary,
          body: normalizedSummary,
          status: canBypassApproval ? "approved" : "pending",
        },
      });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("community_updates")
      .select("id, author_member_id")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Community update not found." }, { status: 404 });
    }

    if (existing.author_member_id !== session.member.id) {
      return NextResponse.json({ error: "You can only edit your own community updates." }, { status: 403 });
    }

    const { data, error } = await admin
      .from("community_updates")
      .update({
        title: null,
        summary: normalizedSummary,
        body: normalizedSummary,
        status: canBypassApproval ? "approved" : "pending",
        approved_at: canBypassApproval ? new Date().toISOString() : null,
        approved_by_member_id: canBypassApproval ? session.member.id : null,
        published_at: canBypassApproval ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select("id, title, summary, body, status")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to update community update." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: canBypassApproval ? "Your update was published." : "Your update was saved and sent for approval.",
      update: data,
    });
  } catch {
    return NextResponse.json({ error: "Unable to update community update." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 });
    }

    const { id } = await params;

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        message: "Community update deleted.",
      });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("community_updates")
      .select("id, author_member_id")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Community update not found." }, { status: 404 });
    }

    if (existing.author_member_id !== session.member.id) {
      return NextResponse.json({ error: "You can only delete your own community updates." }, { status: 403 });
    }

    const { error } = await admin.from("community_updates").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Community update deleted.",
    });
  } catch {
    return NextResponse.json({ error: "Unable to delete community update." }, { status: 500 });
  }
}
