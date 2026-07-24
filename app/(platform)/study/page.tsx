import { redirect } from "next/navigation";

import { GalleryPageClient } from "@/components/gallery/gallery-page-client";
import { PageHeader } from "@/components/page-header";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getGalleryPosts } from "@/lib/gallery";

export default async function StudyPage() {
  const session = await getAuthenticatedMemberSession();

  if (!session) {
    redirect("/access-required?context=gallery&next=%2Fstudy");
  }

  if (session.member.status !== "active") {
    redirect("/access-required?mode=pending&context=gallery&next=%2Fstudy");
  }

  const roles = await getMemberRoles(session.member.id);
  const canCompose = roles.includes("leader") || roles.includes("admin");
  const posts = await getGalleryPosts(session.member.church_id);

  return (
    <main className="shell max-w-[560px] py-6">
      <PageHeader title="" />
      <GalleryPageClient canCompose={canCompose} initialPosts={posts} />
    </main>
  );
}
