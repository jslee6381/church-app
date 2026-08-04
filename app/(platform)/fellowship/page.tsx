import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { MemberLocalSync } from "@/components/auth/member-local-sync";
import { PullToRefresh } from "@/components/common/pull-to-refresh";
import { CommunityUpdatesSection } from "@/components/community/community-updates-section";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getMemberSession } from "@/lib/auth/session";
import { getCommunityUpdateFeedPage } from "@/lib/community-updates";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ArchiveButtonIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[1rem] w-[1rem] shrink-0"
      style={{
        backgroundColor: "currentColor",
        maskImage: "url('/archive-button-icon.png')",
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskImage: "url('/archive-button-icon.png')",
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

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
              className="ui-text inline-flex min-h-11 items-center bg-transparent px-0 font-semibold text-foreground"
              href="/home"
              aria-label="Back to Home"
            >
              <ChevronLeft className="size-6" />
            </Link>
            <Link
              className="moments-more-button ui-text inline-flex min-h-11 items-center gap-2 rounded-[14px] border-0 bg-transparent px-4 transition hover:bg-transparent dark:border-0 dark:bg-transparent dark:hover:bg-transparent"
              href="/archive"
            >
              <ArchiveButtonIcon />
              Archive
            </Link>
          </header>

          <section className="fade-up mt-3 -mx-4">
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
          color: #000000;
        }

        :root[data-theme="dark"] .moments-more-button {
          color: #E0E0E0;
        }
      `}</style>
    </PullToRefresh>
  );
}
