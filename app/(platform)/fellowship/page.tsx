import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { MemberLocalSync } from "@/components/auth/member-local-sync";
import { PullToRefresh } from "@/components/common/pull-to-refresh";
import { CommunityUpdatesSection } from "@/components/community/community-updates-section";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getMemberSession } from "@/lib/auth/session";
import { getCommunityUpdateFeedPage } from "@/lib/community-updates";
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
  const canAccessAdmin = roles.includes("admin");
  const currentMemberPhotoUrl = authSession ? await getProfilePhotoUrl(authSession.member.id) : null;
  const currentMemberName = authSession?.member.display_name ?? authSession?.member.full_name ?? null;
  const communityGreeting = authSession?.member.status === "active" ? getEasternGreeting() : null;
  const initialFeedPage = authSession?.member.church_id
    ? await getCommunityUpdateFeedPage(authSession.member.church_id, authSession.member.id, 0, 3)
    : { items: [], hasMore: false, nextOffset: 0 };

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
          <header className="mb-5 flex items-center justify-between gap-4">
            <Link
              className="ui-text inline-flex min-h-11 items-center gap-2 bg-transparent px-0 font-semibold text-foreground"
              href="/home"
            >
              <ChevronLeft className="size-4" />
              Home
            </Link>
            <Link
              className="moments-more-button ui-text inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-transparent bg-primary px-4 font-semibold transition hover:bg-primary"
              href="/archive"
            >
              More
              <ChevronRight className="size-4" />
            </Link>
          </header>

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
              initialHasMore={initialFeedPage.hasMore}
              initialNextOffset={initialFeedPage.nextOffset}
              initialUpdates={initialFeedPage.items}
              nextPath="/fellowship"
              submitAccessState={!authSession ? "signed_out" : authSession.member.status === "active" ? "active" : "pending"}
            />
          </section>
        </div>
      </main>
      <style>{`
        :root[data-theme="light"] .moments-more-button {
          color: #ffffff;
        }

        :root[data-theme="dark"] .moments-more-button {
          color: #000000;
        }
      `}</style>
    </PullToRefresh>
  );
}
