import { redirect } from "next/navigation";
import { ChatPageClient } from "@/components/chat/chat-page-client";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getChatRoomsForMember } from "@/lib/chat";

export default async function ChatPage() {
  const session = await getAuthenticatedMemberSession();

  if (!session) {
    redirect("/access-required?context=chat&next=%2Fchat");
  }

  if (session.member.status !== "active") {
    redirect("/access-required?mode=pending&context=chat&next=%2Fchat");
  }

  const rooms = await getChatRoomsForMember(session.member.church_id, session.member.id);

  return (
    <main className="shell max-w-[560px] py-6">
      <ChatPageClient
        currentMemberId={session.member.id}
        initialRooms={rooms}
      />
    </main>
  );
}
