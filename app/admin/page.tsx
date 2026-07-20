import { CommunityUpdatesModeration } from "@/components/admin/community-updates-moderation";
import { MemberRoleManager } from "@/components/admin/member-role-manager";
import { PendingMembersApproval } from "@/components/admin/pending-members-approval";
import { PrayerModerationDashboard } from "@/components/admin/prayer-moderation-dashboard";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardData } from "@/lib/admin/dashboard";
import { requireAdminOrLeaderSession } from "@/lib/auth/authorization";
import { formatEasternMonthDay } from "@/lib/eastern-time";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PrayerQueueItem = {
  id: string;
  requestText: string;
  status: "pending" | "approved" | "rejected" | "archived";
  visibility: "public" | "small_group" | "leaders_only";
  requesterName: string;
  createdAtLabel: string;
  publishedAtLabel?: string | null;
  followUps: {
    id: string;
    authorName: string;
    message: string;
    createdAtLabel: string;
  }[];
};

type CommunityUpdateQueueItem = {
  id: string;
  title: string;
  summary: string;
  body: string;
  imageUrl: string | null;
  imageUrls: string[];
  activityDate: string | null;
  status: "pending" | "approved" | "rejected" | "archived";
  authorName: string;
  createdAtLabel: string;
  publishedAtLabel?: string | null;
};

type MemberManagementItem = {
  id: string;
  displayName: string;
  status: string;
  roleName: "admin" | "leader" | "member";
};

function formatPrayerItem(item: {
  id: string;
  title: string | null;
  request_text: string;
  status: PrayerQueueItem["status"];
  visibility: PrayerQueueItem["visibility"];
  created_at: string;
  published_at: string | null;
  requester_member?: { full_name: string | null } | { full_name: string | null }[] | null;
}): PrayerQueueItem {
  const requester = Array.isArray(item.requester_member) ? item.requester_member[0] : item.requester_member;

  return {
    id: item.id,
    requestText: item.request_text,
    status: item.status,
    visibility: item.visibility,
    requesterName: requester?.full_name ?? "Unknown member",
    createdAtLabel: formatEasternMonthDay(item.created_at),
    publishedAtLabel: item.published_at ? formatEasternMonthDay(item.published_at) : null,
    followUps: [],
  };
}

async function getPrayerModerationData(churchId: string) {
  if (!hasAdminEnvironment()) {
    return {
      pending: [
        {
          id: "demo-prayer-1",
          requestText: "Please pray for peace, focus, and strength during this exam season.",
          status: "pending" as const,
          visibility: "public" as const,
          requesterName: "Hannah Cho",
          createdAtLabel: "Jul 19",
          publishedAtLabel: null,
          followUps: [],
        },
      ],
      reviewed: [],
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("prayer_requests")
    .select("id, title, request_text, status, visibility, created_at, published_at, requester_member:members!prayer_requests_requester_member_id_fkey(full_name)")
    .eq("church_id", churchId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !data) {
    return {
      pending: [] as PrayerQueueItem[],
      reviewed: [] as PrayerQueueItem[],
    };
  }

  const items = data.map(formatPrayerItem);
  const prayerIds = items.map((item) => item.id);
  const { data: followUpRows } =
    prayerIds.length > 0
      ? await admin
          .from("prayer_request_follow_ups")
          .select("id, prayer_request_id, message, created_at, author_member:members!prayer_request_follow_ups_author_member_id_fkey(display_name, full_name)")
          .in("prayer_request_id", prayerIds)
          .order("created_at", { ascending: true })
      : { data: [] as never[] };

  const enrichedItems = items.map((item) => ({
    ...item,
    followUps: (followUpRows ?? [])
      .filter((row) => row.prayer_request_id === item.id)
      .map((row) => {
        const author = Array.isArray(row.author_member) ? row.author_member[0] : row.author_member;

        return {
          id: row.id,
          authorName: author?.display_name ?? author?.full_name ?? "Church Member",
          message: row.message,
          createdAtLabel: formatEasternMonthDay(row.created_at),
        };
      }),
  }));

  return {
    pending: enrichedItems.filter((item) => item.status === "pending"),
    reviewed: enrichedItems.filter((item) => item.status !== "pending"),
  };
}

async function getCommunityUpdatesModerationData(churchId: string) {
  if (!hasAdminEnvironment()) {
    return {
      pending: [] as CommunityUpdateQueueItem[],
      reviewed: [] as CommunityUpdateQueueItem[],
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_updates")
    .select("id, title, summary, body, image_url, activity_date, status, created_at, published_at, author_member:members!community_updates_author_member_id_fkey(display_name, full_name)")
    .eq("church_id", churchId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !data) {
    return {
      pending: [] as CommunityUpdateQueueItem[],
      reviewed: [] as CommunityUpdateQueueItem[],
    };
  }

  const updateIds = data.map((item) => item.id);
  const { data: imageRows } =
    updateIds.length > 0
      ? await admin
          .from("community_update_images")
          .select("community_update_id, image_url, sort_order")
          .in("community_update_id", updateIds)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : { data: [] as never[] };

  const items = data.map((item) => {
    const author = Array.isArray(item.author_member) ? item.author_member[0] : item.author_member;
    const imageUrls = (imageRows ?? [])
      .filter((row) => row.community_update_id === item.id)
      .map((row) => row.image_url);

    return {
      id: item.id,
      title: item.title,
      summary: item.summary ?? "",
      body: item.body ?? item.summary ?? "",
      imageUrl: imageUrls[0] ?? item.image_url ?? null,
      imageUrls: imageUrls.length > 0 ? imageUrls : item.image_url ? [item.image_url] : [],
      activityDate: item.activity_date,
      status: item.status as CommunityUpdateQueueItem["status"],
      authorName: author?.display_name ?? author?.full_name ?? "Church Member",
      createdAtLabel: formatEasternMonthDay(item.created_at),
      publishedAtLabel: item.published_at ? formatEasternMonthDay(item.published_at) : null,
    } satisfies CommunityUpdateQueueItem;
  });

  return {
    pending: items.filter((item) => item.status === "pending"),
    reviewed: items.filter((item) => item.status !== "pending"),
  };
}

async function getMemberManagementData(churchId: string) {
  if (!hasAdminEnvironment()) {
    return [
      { id: "demo-admin", displayName: "Admin User", status: "active", roleName: "admin" },
      { id: "demo-leader", displayName: "Grace Lee", status: "active", roleName: "leader" },
      { id: "demo-member", displayName: "Esther Park", status: "active", roleName: "member" },
    ] satisfies MemberManagementItem[];
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("members")
    .select("id, display_name, full_name, status, member_roles!left(roles!inner(name))")
    .eq("church_id", churchId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((member) => {
    const memberRoles = Array.isArray(member.member_roles) ? member.member_roles : member.member_roles ? [member.member_roles] : [];
    const roleNames = memberRoles
      .map((entry) => {
        const roleEntry = (entry as { roles?: { name?: string } | Array<{ name?: string }> }).roles;
        return Array.isArray(roleEntry) ? roleEntry[0]?.name : roleEntry?.name;
      })
      .filter((value): value is string => Boolean(value));

    return {
      id: member.id,
      displayName: member.display_name ?? member.full_name,
      status: member.status,
      roleName: roleNames.includes("admin") ? "admin" : roleNames.includes("leader") ? "leader" : "member",
    } satisfies MemberManagementItem;
  });
}

export default async function AdminPage() {
  const session = await requireAdminOrLeaderSession();
  const [queue, dashboard, communityQueue, members] = await Promise.all([
    getPrayerModerationData(session.member.church_id),
    getAdminDashboardData(session.member.church_id),
    getCommunityUpdatesModerationData(session.member.church_id),
    getMemberManagementData(session.member.church_id),
  ]);

  const isAdmin = session.roles.includes("admin");

  return (
    <main className="shell">
      <PageHeader title="Admin Dashboard" description="Approve members, moderate prayer and community updates, and manage church roles." />

      <section>
        <Card>
          <CardHeader className="pb-3">
            <p className="section-kicker">Overview</p>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-0 p-0">
            <div className="px-4 py-5 text-center">
              <p className="m-0 text-[1.9rem] font-semibold text-foreground">{dashboard.overview.memberCount}</p>
              <p className="mt-1 mb-0 text-sm leading-6 text-muted-foreground">Active members</p>
            </div>
            <div className="border-x border-border/80 px-4 py-5 text-center">
              <p className="m-0 text-[1.9rem] font-semibold text-foreground">{dashboard.overview.pendingPrayerCount}</p>
              <p className="mt-1 mb-0 text-sm leading-6 text-muted-foreground">Pending prayer requests</p>
            </div>
            <div className="px-4 py-5 text-center">
              <p className="m-0 text-[1.9rem] font-semibold text-foreground">{communityQueue.pending.length}</p>
              <p className="mt-1 mb-0 text-sm leading-6 text-muted-foreground">Pending community updates</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="summary-grid">
        <PendingMembersApproval initialMembers={dashboard.pendingMembers} />
        <MemberRoleManager canAssignRoles={isAdmin} initialMembers={members} />
      </section>

      <PrayerModerationDashboard pending={queue.pending} reviewed={queue.reviewed} />
      <CommunityUpdatesModeration pending={communityQueue.pending} reviewed={communityQueue.reviewed} />
    </main>
  );
}
