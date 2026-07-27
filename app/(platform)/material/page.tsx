import { VideoPageClient } from "@/components/video/video-page-client";
import { PageHeader } from "@/components/page-header";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getDefaultChurchId } from "@/lib/church-context";
import { getVideoPosts } from "@/lib/videos";

export default async function MaterialPage() {
  const session = await getAuthenticatedMemberSession();
  const canCompose = session?.member.status === "active"
    ? (await getMemberRoles(session.member.id)).some((role) => role === "leader" || role === "admin")
    : false;
  const churchId = session?.member.church_id ?? (await getDefaultChurchId());
  const posts = await getVideoPosts(churchId);

  return (
    <main className="shell max-w-[560px] py-6">
      <PageHeader title="" />
      <VideoPageClient canCompose={canCompose} initialPosts={posts} />
    </main>
  );
}
