import { redirect } from "next/navigation";
import { ChatPageClient } from "@/components/chat/chat-page-client";
import { PageHeader } from "@/components/page-header";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getActiveChatCandidates, getChatRoomsForMember } from "@/lib/chat";

export default async function ChatPage() {
  const session = await getAuthenticatedMemberSession();

  if (!session) {
    redirect("/access-required?context=chat&next=%2Fchat");
  }

  if (session.member.status !== "active") {
    redirect("/access-required?mode=pending&context=chat&next=%2Fchat");
  }

  const [rooms, candidates] = await Promise.all([
    getChatRoomsForMember(session.member.church_id, session.member.id),
    getActiveChatCandidates(session.member.church_id),
  ]);

  return (
    <main className="shell max-w-[560px] py-6">
      <PageHeader title="" />
      <ChatPageClient
        currentMemberId={session.member.id}
        initialCandidates={candidates}
        initialRooms={rooms}
      />
    </main>
  );
}
