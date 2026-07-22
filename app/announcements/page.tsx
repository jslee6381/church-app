import { AnnouncementsPageClient } from "@/components/announcements/announcements-page-client";
import { PageHeader } from "@/components/page-header";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { announcements } from "@/lib/data";

export default async function AnnouncementsPage() {
  const session = await getAuthenticatedMemberSession();
  const roles = session ? await getMemberRoles(session.member.id) : [];
  const canCompose = session?.member.status === "active" && (roles.includes("leader") || roles.includes("admin"));

  return (
    <main className="shell">
      <PageHeader title="" />
      <AnnouncementsPageClient canCompose={canCompose} initialAnnouncements={announcements} />
    </main>
  );
}
