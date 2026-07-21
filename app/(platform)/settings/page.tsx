import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DisplayNameEditor } from "@/components/auth/display-name-editor";
import { ProfilePhotoEditor } from "@/components/auth/profile-photo-editor";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { GoogleSignOutButton } from "@/components/auth/google-sign-out-button";
import { FontSizeEditor } from "@/components/settings/font-size-editor";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

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

export default async function SettingsPage() {
  const session = await getAuthenticatedMemberSession();
  const profilePhotoUrl = session ? await getProfilePhotoUrl(session.member.id) : null;

  return (
    <main className="shell max-w-[560px] py-6">
      <div className="mb-5">
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-[16px] border border-border/80 bg-white/80 px-4 text-sm font-semibold text-foreground transition hover:bg-white"
          href="/home"
        >
          <ChevronLeft className="size-4" />
          Home
        </Link>
      </div>

      {!session ? (
        <>
          <p className="m-0 text-[1rem] leading-7 text-muted-foreground">
            Sign in with Google to access Prayer and personalize your display name.
          </p>
          <div className="mt-5">
            <GoogleSignInButton nextPath="/settings" />
          </div>
          <div className="mt-5">
            <FontSizeEditor />
          </div>
        </>
      ) : (
        <>
          <div className="mt-5">
            <ProfilePhotoEditor
              displayName={session.member.display_name ?? session.member.full_name}
              initialPhotoUrl={profilePhotoUrl}
            />
            <DisplayNameEditor initialDisplayName={session.member.display_name ?? session.member.full_name} />
          </div>
          <FontSizeEditor />
          <div className="mt-4 flex items-center justify-between gap-3 px-0 py-1">
            <div>
              <p className="ui-text m-0 font-semibold text-foreground">Member status</p>
              <p className="ui-text m-0 mt-1 text-muted-foreground">
                {session.member.status === "active" ? "Approved member" : "Awaiting admin approval"}
              </p>
            </div>
            <GoogleSignOutButton />
          </div>
        </>
      )}
    </main>
  );
}
