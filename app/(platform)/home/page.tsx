import { MemberLocalSync } from "@/components/auth/member-local-sync";
import { PullToRefresh } from "@/components/common/pull-to-refresh";
import { HomeHeaderActions } from "@/components/home/home-header-actions";
import { HomeTabbedSections } from "@/components/home/home-tabbed-sections";
import { getAnnouncementCarouselItem } from "@/lib/announcements";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getDefaultChurchId } from "@/lib/church-context";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getMemberSession } from "@/lib/auth/session";
import { getUpcomingEventCarouselItem } from "@/lib/events";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

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
  const canAccessAdmin = roles.includes("admin");
  const currentMemberPhotoUrl = authSession ? await getProfilePhotoUrl(authSession.member.id) : null;
  const churchId = authSession?.member.church_id ?? (await getDefaultChurchId());
  const [initialAnnouncement, initialEvent] = await Promise.all([
    getAnnouncementCarouselItem(churchId, 0),
    getUpcomingEventCarouselItem(churchId, 0),
  ]);

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
          headerAction={(
            <HomeHeaderActions
              initialAuthenticated={Boolean(authSession)}
              initialCanAccessAdmin={canAccessAdmin}
              initialDisplayName={authSession?.member.display_name ?? authSession?.member.full_name ?? null}
              initialProfilePhotoUrl={currentMemberPhotoUrl}
            />
          )}
          initialAnnouncement={initialAnnouncement}
          initialEvent={initialEvent}
          wordmark={{
            light: {
              src: "/aaa-light-transparent.png",
              width: 2149,
              height: 732,
            },
            dark: {
              src: "/aaa-dark-transparent.png",
              width: 2146,
              height: 733,
            },
          }}
        />
      </main>
    </PullToRefresh>
  );
}
