import { NextResponse } from "next/server";
import { canSelfApproveByRole, getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

const CONTENT_LIMIT = 150;

function normalizeText(text: string) {
  return text.trim().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 });
    }

    if (session.member.status !== "active") {
      return NextResponse.json({ error: "Your member access is still awaiting approval." }, { status: 403 });
    }

    const { id } = await params;
    const { message } = (await request.json()) as { message?: string };
    const normalizedMessage = normalizeText(message ?? "");
    const roles = await getMemberRoles(session.member.id);
    const canBypassOwnership = canSelfApproveByRole(roles);

    if (!normalizedMessage) {
      return NextResponse.json({ error: "Please write a short follow-up." }, { status: 400 });
    }

    if (normalizedMessage.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the content under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        followUp: {
          id: crypto.randomUUID(),
          authorName: session.member.display_name ?? session.member.full_name,
          message: normalizedMessage,
          createdAtLabel: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date()),
        },
      });
    }

    const admin = createAdminClient();
    const { data: prayerRequest } = await admin
      .from("prayer_requests")
      .select("id, requester_member_id")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!prayerRequest) {
      return NextResponse.json({ error: "Prayer request not found." }, { status: 404 });
    }

    if (prayerRequest.requester_member_id !== session.member.id && !canBypassOwnership) {
      return NextResponse.json({ error: "Only the requester can add a follow-up." }, { status: 403 });
    }

    const { data, error } = await admin
      .from("prayer_request_follow_ups")
      .insert({
        prayer_request_id: id,
        author_member_id: session.member.id,
        message: normalizedMessage,
      })
      .select("id, message, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to add follow-up." }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "prayer_request_follow_ups",
      entity_id: data.id,
      action: "create",
      metadata: {
        prayerRequestId: id,
      },
    });

    return NextResponse.json({
      success: true,
      followUp: {
        id: data.id,
        authorName: session.member.display_name ?? session.member.full_name,
        message: data.message,
        createdAtLabel: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(data.created_at)),
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to add follow-up." }, { status: 500 });
  }
}
