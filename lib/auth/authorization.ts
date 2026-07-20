import "server-only";
import { redirect } from "next/navigation";
import { getMemberSession } from "@/lib/auth/session";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { getPrimaryRole, type AppRole } from "@/lib/roles";

export async function getMemberRoles(memberId: string) {
  if (!hasAdminEnvironment()) {
    return ["admin"];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("member_roles")
    .select("roles!inner(name)")
    .eq("member_id", memberId);

  if (error || !data) {
    return [];
  }

  return data
    .map((item) => {
      const roleEntry = (item as { roles?: { name?: string } | Array<{ name?: string }> }).roles;
      return Array.isArray(roleEntry) ? roleEntry[0]?.name : roleEntry?.name;
    })
    .filter((value): value is string => Boolean(value));
}

export function canSelfApproveByRole(roles: string[]) {
  return roles.includes("admin") || roles.includes("leader");
}

export async function getActiveMemberContext() {
  const authSession = await getAuthenticatedMemberSession();
  const inviteSession = authSession ? null : await getMemberSession();
  const member = authSession?.member ?? inviteSession?.member;

  if (!member) {
    return null;
  }

  const roles = await getMemberRoles(member.id);

  return {
    sessionId: inviteSession?.sessionId ?? authSession?.user.id ?? "auth-session",
    member,
    expiresAt: inviteSession?.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    roles,
    primaryRole: getPrimaryRole(roles) as AppRole,
  };
}

export async function requireAdminOrLeaderSession() {
  const context = await getActiveMemberContext();

  if (!context) {
    redirect("/prayer");
  }

  if (!context.roles.includes("admin") && !context.roles.includes("leader")) {
    redirect("/home");
  }

  return context;
}

export async function requireAdminSession() {
  const context = await requireAdminOrLeaderSession();

  if (!context.roles.includes("admin")) {
    redirect("/home");
  }

  return context;
}
