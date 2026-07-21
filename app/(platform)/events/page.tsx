import { PullToRefresh } from "@/components/common/pull-to-refresh";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { EventsPageClient } from "@/components/events/events-page-client";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getDefaultChurchId } from "@/lib/church-context";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getUpcomingEvents } from "@/lib/events";

export default async function EventsPage() {
  const authSession = await getAuthenticatedMemberSession();
  const roles = authSession ? await getMemberRoles(authSession.member.id) : [];
  const canManage = roles.includes("admin") || roles.includes("leader");
  const churchId = authSession?.member.church_id ?? (await getDefaultChurchId());
  const events = await getUpcomingEvents(churchId);

  return (
    <PullToRefresh>
      <main className="shell max-w-[560px] py-6">
        <header className="mb-5">
          <Link className="inline-flex min-h-11 items-center gap-2 bg-transparent px-0 text-base font-semibold text-foreground" href="/home">
            <ChevronLeft className="size-4" />
            Home
          </Link>
        </header>

        <EventsPageClient canManage={canManage} initialEvents={events} />
      </main>
    </PullToRefresh>
  );
}
