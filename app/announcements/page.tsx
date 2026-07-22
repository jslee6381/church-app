import { AnnouncementsPageClient } from "@/components/announcements/announcements-page-client";
import { PageHeader } from "@/components/page-header";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getAnnouncements } from "@/lib/announcements";
import { getDefaultChurchId } from "@/lib/church-context";

export default async function AnnouncementsPage() {
  const session = await getAuthenticatedMemberSession();
  const roles = session ? await getMemberRoles(session.member.id) : [];
  const canCompose = session?.member.status === "active" && (roles.includes("leader") || roles.includes("admin"));
  const churchId = session?.member.church_id ?? (await getDefaultChurchId());
  const announcements = await getAnnouncements(churchId);

  return (
    <main className="shell">
      <PageHeader title="" />
      <AnnouncementsPageClient canCompose={canCompose} initialAnnouncements={announcements} />
    </main>
  );
}
