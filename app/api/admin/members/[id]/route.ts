import { NextResponse } from "next/server";
import { requireAdminSession, requireAdminOrLeaderSession } from "@/lib/auth/authorization";
import { isProtectedAdminEmail } from "@/lib/protected-admin";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { ensureChurchRoles } from "@/lib/roles";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminOrLeaderSession();
    const { id } = await context.params;
    const { status } = (await request.json()) as { status?: "active" | "inactive" | "invited" };

    if (!status || !["active", "inactive", "invited"].includes(status)) {
      return NextResponse.json({ error: "A valid member status is required." }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        member: {
          id,
          status,
        },
      });
    }

    const admin = createAdminClient();
    const { data: targetMember } = await admin
      .from("members")
      .select("id, email")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!targetMember) {
      return NextResponse.json({ error: "Unable to find that member." }, { status: 404 });
    }

    if (isProtectedAdminEmail(targetMember.email)) {
      return NextResponse.json({ error: "This admin account is protected and cannot be changed." }, { status: 403 });
    }

    let assignedRoleName: string | null = null;
    const { data, error } = await admin
      .from("members")
      .update({ status })
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .select("id, display_name, full_name, status, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to update member." }, { status: 500 });
    }

    if (status === "active") {
      const roleMap = await ensureChurchRoles(session.member.church_id);
      const { data: existingRoles } = await admin.from("member_roles").select("role_id").eq("member_id", id);

      if (!existingRoles || existingRoles.length === 0) {
        const memberRoleId = roleMap.get("member");

        if (memberRoleId) {
          await admin.from("member_roles").insert({
            member_id: id,
            role_id: memberRoleId,
          });
          assignedRoleName = "member";
        }
      }
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "members",
      entity_id: id,
      action: "approve",
      metadata: {
        status,
        assignedRoleName,
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        ...data,
        assignedRoleName,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to update member status." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await context.params;

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        member: {
          id,
        },
      });
    }

    const admin = createAdminClient();
    const { data: targetMember } = await admin
      .from("members")
      .select("id, email, church_id")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!targetMember) {
      return NextResponse.json({ error: "Unable to find that member." }, { status: 404 });
    }

    if (targetMember.id === session.member.id) {
      return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 403 });
    }

    if (isProtectedAdminEmail(targetMember.email)) {
      return NextResponse.json({ error: "This admin account is protected and cannot be deleted." }, { status: 403 });
    }

    const { error } = await admin
      .from("members")
      .delete()
      .eq("id", id)
      .eq("church_id", session.member.church_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "members",
      entity_id: id,
      action: "delete",
      metadata: {
        deletedEmail: targetMember.email,
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        id,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to delete member." }, { status: 500 });
  }
}
