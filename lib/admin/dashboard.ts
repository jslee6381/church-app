import "server-only";
import { formatEasternMonthDay } from "@/lib/eastern-time";
import { socialPosts, sampleEvents } from "@/lib/data";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { formatEventDate, formatEventTime } from "@/lib/events";

export type AdminOverview = {
  memberCount: number;
  pendingPrayerCount: number;
  upcomingEventCount: number;
  invitationTokenCount: number;
};

export type AdminPrayerItem = {
  id: string;
  title: string;
  requesterName: string;
  createdAtLabel: string;
};

export type AdminEventItem = {
  id: string;
  title: string;
  summary: string;
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
  startsAt: string;
  imageUrl?: string | null;
  isLiveStream?: boolean;
};

export type AdminCommunityUpdateItem = {
  id: string;
  title: string;
  summary: string;
  dateLabel: string;
};

export type AdminMemberItem = {
  id: string;
  displayName: string;
  role: string;
  ministry: string | null;
};

export type AdminPendingMemberItem = {
  id: string;
  displayName: string;
  fullName: string;
  createdAtLabel: string;
  status: string;
};

function getDemoAdminDashboardData() {
  return {
    overview: {
      memberCount: 48,
      pendingPrayerCount: 3,
      upcomingEventCount: sampleEvents.length,
      invitationTokenCount: 12,
    } satisfies AdminOverview,
    members: [
      { id: "demo-admin-1", displayName: "Daniel Kim", role: "Admin", ministry: "Sunday Worship" },
      { id: "demo-leader-1", displayName: "Grace Lee", role: "Leader", ministry: "Prayer" },
      { id: "demo-member-1", displayName: "Esther Park", role: "Member", ministry: "Hospitality" },
    ] satisfies AdminMemberItem[],
    pendingMembers: [
      {
        id: "demo-pending-member-1",
        displayName: "Grace Visitor",
        fullName: "Grace Visitor",
        createdAtLabel: "Jul 19",
        status: "invited",
      },
    ] satisfies AdminPendingMemberItem[],
    pendingPrayerRequests: [
      { id: "demo-prayer-1", title: "Prayer for upcoming exams", requesterName: "Hannah Cho", createdAtLabel: "Jul 9" },
      { id: "demo-prayer-2", title: "Healing for a family member", requesterName: "Paul Kim", createdAtLabel: "Jul 8" },
      { id: "demo-prayer-3", title: "Safe travel for summer mission", requesterName: "Mina Lee", createdAtLabel: "Jul 7" },
    ] satisfies AdminPrayerItem[],
    upcomingEvents: sampleEvents.slice(0, 3).map((event) => ({
      id: event.id,
      title: event.title,
      summary: event.summary,
      dateLabel: formatEventDate(event.startsAt),
      timeLabel: formatEventTime(event.startsAt),
      locationLabel: event.locationName ?? "Location to be announced",
      startsAt: event.startsAt,
      imageUrl: event.posterSrc ?? null,
      isLiveStream: event.isLiveStream ?? false,
    })) satisfies AdminEventItem[],
    latestCommunityUpdates: socialPosts.slice(0, 3).map((post) => ({
      id: String(post.id),
      title: post.title,
      summary: post.summary,
      dateLabel: post.date,
    })) satisfies AdminCommunityUpdateItem[],
  };
}

export async function getAdminDashboardData(churchId: string) {
  if (!hasAdminEnvironment()) {
    return getDemoAdminDashboardData();
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const [membersRes, prayersRes, eventsRes, updatesRes, tokensRes, pendingMembersRes] = await Promise.all([
    admin
      .from("members")
      .select("id, display_name, full_name, ministries!left(name), member_roles!left(roles!inner(name))", { count: "exact" })
      .eq("church_id", churchId)
      .eq("status", "active")
      .limit(6),
    admin
      .from("prayer_requests")
      .select("id, title, created_at, requester_member:members!prayer_requests_requester_member_id_fkey(full_name)", { count: "exact" })
      .eq("church_id", churchId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(6),
    admin
      .from("events")
      .select("id, title, summary, starts_at, location_name, image_url, is_live_stream", { count: "exact" })
      .eq("church_id", churchId)
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(6),
    admin
      .from("community_updates")
      .select("id, title, summary, activity_date, published_at")
      .eq("church_id", churchId)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("activity_date", { ascending: false, nullsFirst: false })
      .limit(4),
    admin
      .from("invitation_tokens")
      .select("id", { count: "exact" })
      .eq("church_id", churchId)
      .eq("status", "active")
      .limit(1),
    admin
      .from("members")
      .select("id, display_name, full_name, status, created_at")
      .eq("church_id", churchId)
      .eq("status", "invited")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const members = (membersRes.data ?? []).map((member) => {
    const roles = Array.isArray(member.member_roles) ? member.member_roles : member.member_roles ? [member.member_roles] : [];
    const roleNames = roles
      .map((entry) => {
        const roleEntry = (entry as { roles?: { name?: string } | Array<{ name?: string }> }).roles;
        return Array.isArray(roleEntry) ? roleEntry[0]?.name : roleEntry?.name;
      })
      .filter((value): value is string => Boolean(value));
    const ministryEntry = member.ministries as { name?: string } | Array<{ name?: string }> | null;
    const ministry = Array.isArray(ministryEntry) ? ministryEntry[0] : ministryEntry;

    return {
      id: member.id,
      displayName: member.display_name ?? member.full_name,
      role: roleNames.includes("admin") ? "Admin" : roleNames.includes("leader") ? "Leader" : "Member",
      ministry: ministry?.name ?? null,
    } satisfies AdminMemberItem;
  });

  const pendingPrayerRequests = (prayersRes.data ?? []).map((item) => ({
    id: item.id,
    title: item.title ?? "Prayer request",
    requesterName: (Array.isArray(item.requester_member) ? item.requester_member[0] : item.requester_member)?.full_name ?? "Unknown member",
    createdAtLabel: formatEasternMonthDay(item.created_at),
  })) satisfies AdminPrayerItem[];

  const upcomingEvents =
    (eventsRes.data ?? []).length > 0
      ? (eventsRes.data ?? []).map((event) => ({
          id: event.id,
          title: event.title,
          summary: event.summary ?? "",
          dateLabel: formatEventDate(event.starts_at),
          timeLabel: formatEventTime(event.starts_at),
          locationLabel: event.location_name ?? "Location to be announced",
          startsAt: event.starts_at,
          imageUrl: event.image_url ?? null,
          isLiveStream: event.is_live_stream ?? false,
        }))
      : sampleEvents.slice(0, 3).map((event) => ({
          id: event.id,
          title: event.title,
          summary: event.summary,
          dateLabel: formatEventDate(event.startsAt),
          timeLabel: formatEventTime(event.startsAt),
          locationLabel: event.locationName ?? "Location to be announced",
          startsAt: event.startsAt,
          imageUrl: event.posterSrc ?? null,
          isLiveStream: event.isLiveStream ?? false,
        }));

  const latestCommunityUpdates =
    (updatesRes.data ?? []).length > 0
      ? (updatesRes.data ?? []).map((update) => ({
          id: update.id,
          title: update.title,
          summary: update.summary ?? "",
          dateLabel: formatEasternMonthDay(update.activity_date ?? update.published_at ?? now),
        }))
      : socialPosts.slice(0, 3).map((post) => ({
          id: String(post.id),
          title: post.title,
          summary: post.summary,
          dateLabel: post.date,
        }));

  const pendingMembers = (pendingMembersRes.data ?? []).map((member) => ({
    id: member.id,
    displayName: member.display_name ?? member.full_name,
    fullName: member.full_name,
    createdAtLabel: formatEasternMonthDay(member.created_at),
    status: member.status,
  })) satisfies AdminPendingMemberItem[];

  return {
    overview: {
      memberCount: membersRes.count ?? members.length,
      pendingPrayerCount: prayersRes.count ?? pendingPrayerRequests.length,
      upcomingEventCount: eventsRes.count ?? upcomingEvents.length,
      invitationTokenCount: tokensRes.count ?? 0,
    } satisfies AdminOverview,
    members,
    pendingMembers,
    pendingPrayerRequests,
    upcomingEvents,
    latestCommunityUpdates,
  };
}
