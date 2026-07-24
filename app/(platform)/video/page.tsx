import { VideoPageClient } from "@/components/video/video-page-client";
import { PageHeader } from "@/components/page-header";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getDefaultChurchId } from "@/lib/church-context";
import { getVideoPosts } from "@/lib/videos";

export default async function VideoPage() {
  const session = await getAuthenticatedMemberSession();
  const roles = session ? await getMemberRoles(session.member.id) : [];
  const canCompose = session?.member.status === "active" && (roles.includes("leader") || roles.includes("admin"));
  const churchId = session?.member.church_id ?? (await getDefaultChurchId());
  const posts = await getVideoPosts(churchId);

  return (
    <main className="shell max-w-[560px] py-6">
      <PageHeader title="" />
      <VideoPageClient canCompose={canCompose} initialPosts={posts} />
    </main>
  );
}
