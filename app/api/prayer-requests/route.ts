import { NextResponse } from "next/server";
import { canSelfApproveByRole, getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

function normalizePrayerText(text: string) {
  return text.trim().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

const CONTENT_LIMIT = 150;

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 });
    }

    if (session.member.status !== "active") {
      return NextResponse.json({ error: "Your member access is still awaiting approval." }, { status: 403 });
    }

    const { requestText } = (await request.json()) as { requestText?: string };
    const normalizedText = normalizePrayerText(requestText ?? "");
    const roles = await getMemberRoles(session.member.id);
    const canBypassApproval = canSelfApproveByRole(roles);

    if (normalizedText.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the content under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        message: canBypassApproval ? "Your prayer request was published." : "Your prayer request has been submitted for review.",
        demo: true,
      });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("prayer_requests").insert({
      church_id: session.member.church_id,
      requester_member_id: session.member.id,
      title: null,
      request_text: normalizedText,
      status: canBypassApproval ? "approved" : "pending",
      visibility: "public",
      approved_by_member_id: canBypassApproval ? session.member.id : null,
      approved_at: canBypassApproval ? new Date().toISOString() : null,
      published_at: canBypassApproval ? new Date().toISOString() : null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "prayer_requests",
      action: "create",
      metadata: {
        status: canBypassApproval ? "approved" : "pending",
      },
    });

    return NextResponse.json({
      success: true,
      message: canBypassApproval ? "Your prayer request was published." : "Your prayer request has been submitted for review.",
      prayerRequest: {
        id: crypto.randomUUID(),
        body: normalizedText,
        status: canBypassApproval ? "approved" : "pending",
        isOwner: true,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to submit prayer request." }, { status: 500 });
  }
}
