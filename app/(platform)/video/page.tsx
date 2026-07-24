import { redirect } from "next/navigation";

import { VideoPageClient } from "@/components/video/video-page-client";
import { PageHeader } from "@/components/page-header";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getVideoPosts } from "@/lib/videos";

export default async function VideoPage() {
  const session = await getAuthenticatedMemberSession();

  if (!session) {
    redirect("/access-required?context=video&next=%2Fvideo");
  }

  if (session.member.status !== "active") {
    redirect("/access-required?mode=pending&context=video&next=%2Fvideo");
  }

  const roles = await getMemberRoles(session.member.id);
  const canCompose = roles.includes("leader") || roles.includes("admin");
  const posts = await getVideoPosts(session.member.church_id);

  return (
    <main className="shell max-w-[560px] py-6">
      <PageHeader title="" />
      <VideoPageClient canCompose={canCompose} initialPosts={posts} />
    </main>
  );
}
