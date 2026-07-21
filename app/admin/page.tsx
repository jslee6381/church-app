import { MemberRoleManager } from "@/components/admin/member-role-manager";
import { PendingMembersApproval } from "@/components/admin/pending-members-approval";
import { PageHeader } from "@/components/page-header";
import { getAdminDashboardData } from "@/lib/admin/dashboard";
import { requireAdminOrLeaderSession } from "@/lib/auth/authorization";
import { isProtectedAdminEmail } from "@/lib/protected-admin";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MemberManagementItem = {
  id: string;
  displayName: string;
  email: string | null;
  isProtected: boolean;
  status: string;
  roleName: "admin" | "leader" | "member";
};

async function getMemberManagementData(churchId: string) {
  if (!hasAdminEnvironment()) {
    return [
      { id: "demo-admin", displayName: "Joseph Lee", email: "leejs6381@gmail.com", isProtected: true, status: "active", roleName: "admin" },
      { id: "demo-leader", displayName: "Grace Lee", email: null, isProtected: false, status: "active", roleName: "leader" },
      { id: "demo-member", displayName: "Esther Park", email: null, isProtected: false, status: "active", roleName: "member" },
    ] satisfies MemberManagementItem[];
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("members")
    .select("id, display_name, full_name, email, status, member_roles!left(roles!inner(name))")
    .eq("church_id", churchId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (data ?? []).map((member: {
    id: string;
    display_name: string | null;
    full_name: string;
    email: string | null;
    status: string;
    member_roles?: unknown;
  }) => {
    const memberRoles = Array.isArray(member.member_roles) ? member.member_roles : member.member_roles ? [member.member_roles] : [];
    const roleNames = memberRoles
      .map((entry: unknown) => {
        const roleEntry = (entry as { roles?: { name?: string } | Array<{ name?: string }> }).roles;
        return Array.isArray(roleEntry) ? roleEntry[0]?.name : roleEntry?.name;
      })
      .filter((value: string | undefined): value is string => Boolean(value));

    return {
      id: member.id,
      displayName: member.display_name ?? member.full_name,
      email: member.email,
      isProtected: isProtectedAdminEmail(member.email),
      status: member.status,
      roleName: isProtectedAdminEmail(member.email) ? "admin" : roleNames.includes("admin") ? "admin" : roleNames.includes("leader") ? "leader" : "member",
    } satisfies MemberManagementItem;
  });
}

export default async function AdminPage() {
  const session = await requireAdminOrLeaderSession();
  const [dashboard, members] = await Promise.all([
    getAdminDashboardData(session.member.church_id),
    getMemberManagementData(session.member.church_id),
  ]);

  const isAdmin = session.roles.includes("admin");

  return (
    <main className="shell">
      <PageHeader title="" />

      <section className="pt-4">
        <p className="section-kicker">Overview</p>
        <div className="mt-4 grid grid-cols-3 gap-0">
          <div className="px-4 py-2 text-center">
            <p className="m-0 text-[1.9rem] font-semibold text-foreground">{dashboard.overview.activeMemberCount}</p>
            <p className="mt-1 mb-0 text-sm leading-6 text-muted-foreground">Active members</p>
          </div>
          <div className="border-x border-border/80 px-4 py-2 text-center">
            <p className="m-0 text-[1.9rem] font-semibold text-foreground">{dashboard.overview.pendingMemberCount}</p>
            <p className="mt-1 mb-0 text-sm leading-6 text-muted-foreground">Pending members</p>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="m-0 text-[1.9rem] font-semibold text-foreground">{dashboard.overview.leaderMemberCount}</p>
            <p className="mt-1 mb-0 text-sm leading-6 text-muted-foreground">Leader members</p>
          </div>
        </div>
      </section>

      <section className="summary-grid">
        <PendingMembersApproval initialMembers={dashboard.pendingMembers} />
        <MemberRoleManager canAssignRoles={isAdmin} canDeleteMembers={isAdmin} initialMembers={members} />
      </section>
    </main>
  );
}
