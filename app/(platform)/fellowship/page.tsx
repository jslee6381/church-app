import Link from "next/link";

import { MemberLocalSync } from "@/components/auth/member-local-sync";
import { PullToRefresh } from "@/components/common/pull-to-refresh";
import { CommunityUpdatesSection } from "@/components/community/community-updates-section";
import { HomeHeaderActions } from "@/components/home/home-header-actions";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getMemberSession } from "@/lib/auth/session";
import { getCommunityUpdateFeed } from "@/lib/community-updates";
import { getEasternGreeting } from "@/lib/eastern-time";
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

export default async function FellowshipPage() {
  const session = await getMemberSession();
  const authSession = await getAuthenticatedMemberSession();
  const roles = authSession ? await getMemberRoles(authSession.member.id) : [];
  const canAccessAdmin = roles.includes("admin") || roles.includes("leader");
  const currentMemberPhotoUrl = authSession ? await getProfilePhotoUrl(authSession.member.id) : null;
  const currentMemberName = authSession?.member.display_name ?? authSession?.member.full_name ?? null;
  const communityGreeting = authSession?.member.status === "active" ? getEasternGreeting() : null;
  const updates = authSession?.member.church_id
    ? await getCommunityUpdateFeed(authSession.member.church_id, authSession.member.id)
    : [];

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

        <div className="mt-2">
          <div className="-mx-4 mb-1">
            <div className="px-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center bg-transparent shadow-none">
                  <Link className="ui-text inline-flex min-h-11 items-center px-4 text-muted-foreground transition" href="/home" style={{ fontWeight: 700 }}>
                    Home
                  </Link>
                  <Link className="ui-text inline-flex min-h-11 items-center px-4 text-foreground" href="/fellowship" style={{ fontWeight: 700 }}>
                    Fellowship
                  </Link>
                </div>
                <div className="shrink-0">
                  <HomeHeaderActions
                    initialAuthenticated={Boolean(authSession)}
                    initialCanAccessAdmin={canAccessAdmin}
                  />
                </div>
              </div>
            </div>
          </div>

          <section className="fade-up mt-3 -mx-4">
            {communityGreeting && currentMemberName ? (
              <div className="px-4 pb-3">
                <p className="ui-text m-0 font-semibold text-foreground">
                  {communityGreeting}, {currentMemberName}
                </p>
              </div>
            ) : null}
            <CommunityUpdatesSection
              canManage={canAccessAdmin}
              canReact={authSession?.member.status === "active"}
              currentMemberPhotoUrl={currentMemberPhotoUrl}
              initialUpdates={updates}
              nextPath="/fellowship"
              submitAccessState={!authSession ? "signed_out" : authSession.member.status === "active" ? "active" : "pending"}
            />
          </section>
        </div>
      </main>
    </PullToRefresh>
  );
}
