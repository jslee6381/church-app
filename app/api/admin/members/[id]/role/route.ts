import { NextResponse } from "next/server";
import { canSelfApproveByRole } from "@/lib/auth/authorization";
import { requireAdminSession } from "@/lib/auth/authorization";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { ensureChurchRoles, normalizeRoleName } from "@/lib/roles";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession();
    const { id } = await context.params;
    const body = (await request.json()) as { roleName?: string };
    const roleName = normalizeRoleName(body.roleName);

    if (!roleName) {
      return NextResponse.json({ error: "A valid role is required." }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        member: {
          id,
          roleName,
        },
      });
    }

    const admin = createAdminClient();
    const roleMap = await ensureChurchRoles(session.member.church_id);
    const roleId = roleMap.get(roleName);

    if (!roleId) {
      return NextResponse.json({ error: "Unable to resolve the selected role." }, { status: 500 });
    }

    await admin.from("member_roles").delete().eq("member_id", id);

    const { error } = await admin.from("member_roles").insert({
      member_id: id,
      role_id: roleId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (canSelfApproveByRole([roleName])) {
      await admin
        .from("members")
        .update({ status: "active" })
        .eq("id", id)
        .eq("church_id", session.member.church_id);
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "member_roles",
      entity_id: id,
      action: "update",
      metadata: {
        roleName,
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        id,
        roleName,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to update member role." }, { status: 500 });
  }
}
