import { NextResponse } from "next/server";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

const CONTENT_LIMIT = 150;

function normalizePrayerText(text: string) {
  return text.trim().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 });
    }

    const { id } = await params;
    const { requestText } = (await request.json()) as { requestText?: string };
    const normalizedText = normalizePrayerText(requestText ?? "");
    const roles = await getMemberRoles(session.member.id);
    const canManageAll = roles.includes("admin") || roles.includes("leader");

    if (normalizedText.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the content under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        prayerRequest: {
          id,
          body: normalizedText,
          status: "approved",
        },
      });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("prayer_requests")
      .select("id, requester_member_id")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Prayer request not found." }, { status: 404 });
    }

    if (!canManageAll && existing.requester_member_id !== session.member.id) {
      return NextResponse.json({ error: "You can only edit your own prayer requests." }, { status: 403 });
    }

    const { data, error } = await admin
      .from("prayer_requests")
      .update({
        title: null,
        request_text: normalizedText,
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by_member_id: session.member.id,
        archived_at: null,
      })
      .eq("id", id)
      .select("id, title, request_text, status")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to update prayer request." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      prayerRequest: {
        id: data.id,
        body: data.request_text,
        status: data.status,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to update prayer request." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 });
    }

    const { id } = await params;
    const roles = await getMemberRoles(session.member.id);
    const canManageAll = roles.includes("admin") || roles.includes("leader");

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
      });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("prayer_requests")
      .select("id, requester_member_id")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Prayer request not found." }, { status: 404 });
    }

    if (!canManageAll && existing.requester_member_id !== session.member.id) {
      return NextResponse.json({ error: "You can only delete your own prayer requests." }, { status: 403 });
    }

    const { error } = await admin.from("prayer_requests").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json({ error: "Unable to delete prayer request." }, { status: 500 });
  }
}
