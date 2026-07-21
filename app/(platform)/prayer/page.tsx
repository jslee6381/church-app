import { PullToRefresh } from "@/components/common/pull-to-refresh";
import { PrayerPageClient } from "@/components/prayer/prayer-page-client";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

type PrayerFeedItem = {
  id: string;
  body: string;
  followUp?: string;
  followUps?: {
    id: string;
    authorName: string;
    message: string;
    createdAtLabel: string;
  }[];
  status?: "pending" | "approved" | "rejected" | "archived";
  isOwner?: boolean;
};

async function getApprovedPrayerFeed(churchId?: string, memberId?: string): Promise<PrayerFeedItem[]> {
  void memberId;

  if (!churchId || !hasAdminEnvironment()) {
    return [
      {
        id: "fallback-1",
        body: "M. Joseph Han, M. James S. Kim, M. Ruth Lim, and Peter Song's family",
        followUp: "M. Ruth Lim is recovering steadily and is thankful for the community's continued prayers.",
      },
      {
        id: "fallback-2",
        body: "Please pray for safe preparation, wise planning, and all needed support to come together.",
        followUp: "The team has begun final preparations, and several practical needs have already been met.",
      },
    ];
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("prayer_requests")
      .select("id, title, request_text, requester_member_id, status")
      .eq("church_id", churchId)
      .eq("status", "approved")
      .eq("visibility", "public")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(error?.message ?? "Unable to fetch prayer feed.");
    }

    if (!data || data.length === 0) {
      return [];
    }

    const prayerIds = data.map((item) => item.id);
    const { data: followUpRows } = await admin
      .from("prayer_request_follow_ups")
      .select("id, prayer_request_id, message, created_at, author_member:members!prayer_request_follow_ups_author_member_id_fkey(display_name, full_name)")
      .in("prayer_request_id", prayerIds)
      .order("created_at", { ascending: true });

    return data.map((item) => ({
      id: item.id,
      body: item.request_text,
      status: item.status,
      isOwner: Boolean(memberId && item.requester_member_id === memberId),
      followUps: (followUpRows ?? [])
        .filter((row) => row.prayer_request_id === item.id)
        .map((row) => {
          const author = Array.isArray(row.author_member) ? row.author_member[0] : row.author_member;
          return {
            id: row.id,
            authorName: author?.display_name ?? author?.full_name ?? "Church Member",
            message: row.message,
            createdAtLabel: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(row.created_at)),
          };
        }),
    }));
  } catch {
    return [
      {
        id: "fallback-1",
        body: "M. Joseph Han, M. James S. Kim, M. Ruth Lim, and Peter Song's family",
        followUp: "M. Ruth Lim is recovering steadily and is thankful for the community's continued prayers.",
      },
      {
        id: "fallback-2",
        body: "Please pray for safe preparation, wise planning, and all needed support to come together.",
        followUp: "The team has begun final preparations, and several practical needs have already been met.",
      },
    ];
  }
}

export default async function PrayerPage() {
  const session = await getAuthenticatedMemberSession();
  const initialFeed = await getApprovedPrayerFeed(session?.member.church_id, session?.member.id);
  const roles = session ? await getMemberRoles(session.member.id) : [];
  const canManageAll = roles.includes("admin") || roles.includes("leader");

  if (!session) {
    redirect("/access-required?context=prayer&next=%2Fprayer");
  }

  if (session.member.status !== "active") {
    redirect("/access-required?mode=pending&context=prayer&next=%2Fprayer");
  }

  return (
    <PullToRefresh>
      <PrayerPageClient
        canManageAll={canManageAll}
        initialFeed={initialFeed}
        memberName={session.member.display_name ?? session.member.full_name}
      />
    </PullToRefresh>
  );
}
