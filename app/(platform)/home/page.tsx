import { MemberLocalSync } from "@/components/auth/member-local-sync";
import { PullToRefresh } from "@/components/common/pull-to-refresh";
import { HomeHeaderActions } from "@/components/home/home-header-actions";
import { HomeTabbedSections } from "@/components/home/home-tabbed-sections";
import { getAnnouncements } from "@/lib/announcements";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getDefaultChurchId } from "@/lib/church-context";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getMemberSession } from "@/lib/auth/session";
import { getCommunityUpdateFeed } from "@/lib/community-updates";
import { getEasternGreeting } from "@/lib/eastern-time";
import { getUpcomingEvents } from "@/lib/events";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import churchWordmark from "@/aaa.png";
import churchWordmarkDark from "@/aaa-dark.png";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getProfilePhotoUrl(memberId: string) {
  if (!hasAdminEnvironment()) {
    return null;
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("members")
      .select("profiles!left(profile_photo_url)")
      .eq("id", memberId)
      .maybeSingle();

    const profile = Array.isArray(data?.profiles) ? data.profiles[0] : data?.profiles;
    return profile?.profile_photo_url ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const session = await getMemberSession();
  const authSession = await getAuthenticatedMemberSession();
  const roles = authSession ? await getMemberRoles(authSession.member.id) : [];
  const canAccessAdmin = roles.includes("admin") || roles.includes("leader");
  const churchId = authSession?.member.church_id ?? (await getDefaultChurchId());
  const announcements = await getAnnouncements(churchId);
  const updates = await getCommunityUpdateFeed(churchId, authSession?.member.id ?? null);
  const events = await getUpcomingEvents(churchId);
  const currentMemberPhotoUrl = authSession ? await getProfilePhotoUrl(authSession.member.id) : null;
  const currentMemberName = authSession?.member.display_name ?? authSession?.member.full_name ?? null;
  const communityGreeting = authSession?.member.status === "active" ? getEasternGreeting() : null;

  return (
    <PullToRefresh>
      <main className="shell max-w-[560px] py-6">
        {session ? (
          <MemberLocalSync
            member={{
              id: session.member.id,
              churchId: session.member.church_id,
              displayName: session.member.full_name,
            }}
          />
        ) : null}
        <HomeTabbedSections
          announcements={announcements}
          canManageCommunity={canAccessAdmin}
          canReact={authSession?.member.status === "active"}
          communityGreeting={communityGreeting}
          currentMemberPhotoUrl={currentMemberPhotoUrl}
          currentMemberName={currentMemberName}
          events={events}
          headerAction={(
            <HomeHeaderActions
              initialAuthenticated={Boolean(authSession)}
              initialCanAccessAdmin={canAccessAdmin}
            />
          )}
          submitAccessState={!authSession ? "signed_out" : authSession.member.status === "active" ? "active" : "pending"}
          updates={updates}
          wordmark={{
            light: churchWordmark,
            dark: churchWordmarkDark,
          }}
        />
      </main>
    </PullToRefresh>
  );
}
