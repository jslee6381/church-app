import { NextResponse } from "next/server";
import { createDemoMemberSession, createMemberSession } from "@/lib/auth/session";
import { findActiveInvitationByCode } from "@/lib/auth/invitations";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeDisplayName(displayName: string) {
  return displayName.trim().replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  try {
    const { code, displayName } = (await request.json()) as {
      code?: string;
      displayName?: string;
    };

    const normalizedName = normalizeDisplayName(displayName ?? "");

    if (!code || !normalizedName || normalizedName.length < 2 || normalizedName.length > 60) {
      return NextResponse.json({ error: "Please enter a display name with at least 2 characters." }, { status: 400 });
    }

    const invitation = await findActiveInvitationByCode(code);

    if (!invitation) {
      return NextResponse.json({ error: "This invitation has expired or can no longer be used." }, { status: 404 });
    }

    if ("isDevelopmentFallback" in invitation && invitation.isDevelopmentFallback) {
      const session = await createDemoMemberSession(normalizedName);

      return NextResponse.json({
        member: {
          id: session.member.id,
          churchId: session.member.church_id,
          displayName: session.member.full_name,
        },
      });
    }

    const admin = createAdminClient();

    const { data: memberRole } = await admin
      .from("roles")
      .select("id")
      .eq("church_id", invitation.church_id)
      .eq("name", "member")
      .maybeSingle();

    const { data: member, error: memberError } = await admin
      .from("members")
      .insert({
        church_id: invitation.church_id,
        invitation_token_id: invitation.id,
        full_name: normalizedName,
        status: "active",
      })
      .select("id, church_id, full_name")
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "There was a problem creating the member record." }, { status: 500 });
    }

    if (memberRole?.id) {
      await admin.from("member_roles").insert({
        member_id: member.id,
        role_id: memberRole.id,
      });
    }

    const nextUsageCount = invitation.usage_count + 1;
    const nextStatus = nextUsageCount >= invitation.max_usage ? "inactive" : "active";

    await admin
      .from("invitation_tokens")
      .update({
        usage_count: nextUsageCount,
        status: nextStatus,
        claimed_by_member_id: invitation.max_usage === 1 ? member.id : null,
      })
      .eq("id", invitation.id);

    await admin.from("audit_logs").insert({
      church_id: invitation.church_id,
      actor_member_id: member.id,
      entity_type: "invitation_tokens",
      entity_id: invitation.id,
      action: "claim_invitation",
      metadata: {
        member_name: normalizedName,
      },
    });

    await createMemberSession({
      id: member.id,
      church_id: member.church_id,
    });

    return NextResponse.json({
      member: {
        id: member.id,
        churchId: member.church_id,
        displayName: member.full_name,
      },
    });
  } catch {
    return NextResponse.json({ error: "There was a problem completing the invitation." }, { status: 500 });
  }
}
