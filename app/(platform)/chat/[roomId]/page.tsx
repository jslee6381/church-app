import { notFound, redirect } from "next/navigation";

import { ChatRoomPageClient } from "@/components/chat/chat-room-page-client";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getChatRoomDetailForMember } from "@/lib/chat";

type Params = Promise<{
  roomId: string;
}>;

export default async function ChatRoomPage({
  params,
}: {
  params: Params;
}) {
  const session = await getAuthenticatedMemberSession();

  if (!session) {
    redirect("/access-required?context=chat&next=%2Fchat");
  }

  if (session.member.status !== "active") {
    redirect("/access-required?mode=pending&context=chat&next=%2Fchat");
  }

  const { roomId } = await params;
  const room = await getChatRoomDetailForMember({
    roomId,
    churchId: session.member.church_id,
    memberId: session.member.id,
  });

  if (!room) {
    notFound();
  }

  return (
    <main className="shell max-w-[560px] py-6">
      <ChatRoomPageClient room={room} />
    </main>
  );
}
