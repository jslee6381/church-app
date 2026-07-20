import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { MemberLocalSync } from "@/components/auth/member-local-sync";
import { HomeTabbedSections } from "@/components/home/home-tabbed-sections";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getDefaultChurchId } from "@/lib/church-context";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getMemberSession } from "@/lib/auth/session";
import { getCommunityUpdateFeed } from "@/lib/community-updates";
import { getUpcomingEvents } from "@/lib/events";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import churchWordmark from "@/aaa.png";
import Link from "next/link";
import { Settings, Shield } from "lucide-react";

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
  const updates = await getCommunityUpdateFeed(churchId, authSession?.member.id ?? null);
  const events = await getUpcomingEvents(churchId);
  const currentMemberPhotoUrl = authSession ? await getProfilePhotoUrl(authSession.member.id) : null;
  const headerAction = !authSession ? (
    <GoogleSignInButton
      className="size-9 min-h-9 rounded-[14px] border-0 bg-transparent px-0 shadow-none hover:bg-transparent hover:shadow-none"
      compact
      iconOnly
      label="Sign in"
      nextPath="/home"
      variant="secondary"
    />
  ) : authSession ? (
    <div className="flex items-center gap-2">
      {canAccessAdmin ? (
        <Link
          aria-label="Admin"
          className="inline-flex size-11 items-center justify-center rounded-[16px] bg-background text-foreground transition hover:bg-background"
          href="/admin"
          title="Admin"
        >
          <Shield className="size-[1.3rem]" />
        </Link>
      ) : null}
      <Link
        aria-label="Settings"
        className="inline-flex size-11 items-center justify-center rounded-[16px] bg-background text-foreground transition hover:bg-background"
        href="/settings"
          title="Settings"
        >
          <Settings className="size-[1.3rem]" />
        </Link>
    </div>
  ) : null;

  return (
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
        canReact={authSession?.member.status === "active"}
        currentMemberPhotoUrl={currentMemberPhotoUrl}
        events={events}
        headerAction={headerAction}
        submitAccessState={!authSession ? "signed_out" : authSession.member.status === "active" ? "active" : "pending"}
        updates={updates}
        wordmark={churchWordmark}
      />
    </main>
  );
}
