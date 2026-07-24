import { MemberLocalSync } from "@/components/auth/member-local-sync";
import { PullToRefresh } from "@/components/common/pull-to-refresh";
import { HomeHeaderActions } from "@/components/home/home-header-actions";
import { HomeTabbedSections } from "@/components/home/home-tabbed-sections";
import { getAnnouncements } from "@/lib/announcements";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getDefaultChurchId } from "@/lib/church-context";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getMemberSession } from "@/lib/auth/session";
import { getUpcomingEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const session = await getMemberSession();
  const authSession = await getAuthenticatedMemberSession();
  const roles = authSession ? await getMemberRoles(authSession.member.id) : [];
  const canAccessAdmin = roles.includes("admin") || roles.includes("leader");
  const churchId = authSession?.member.church_id ?? (await getDefaultChurchId());
  const announcements = await getAnnouncements(churchId);
  const events = await getUpcomingEvents(churchId);

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
          events={events}
          headerAction={(
            <HomeHeaderActions
              initialAuthenticated={Boolean(authSession)}
              initialCanAccessAdmin={canAccessAdmin}
            />
          )}
          wordmark={{
            light: {
              src: "/aaa.png",
              width: 4295,
              height: 1116,
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
