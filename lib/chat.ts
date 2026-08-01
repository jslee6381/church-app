import "server-only";

import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export type ChatCandidateMember = {
  id: string;
  displayName: string;
};

export type ChatRoomListItem = {
  id: string;
  title: string;
  description: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  memberCount: number;
};

export type ChatRoomMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string | null;
  senderName: string;
  isOwnMessage: boolean;
};

export type ChatRoomDetail = {
  id: string;
  title: string;
  description: string | null;
  memberCount: number;
  members: ChatCandidateMember[];
  messages: ChatRoomMessage[];
};

function getPreferredName(member: {
  display_name?: string | null;
  full_name?: string | null;
}) {
  return member.display_name?.trim() || member.full_name?.trim() || "Member";
}

export async function getActiveChatCandidates(churchId?: string | null): Promise<ChatCandidateMember[]> {
  if (!hasAdminEnvironment() || !churchId) {
    return [];
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("members")
      .select("id, display_name, full_name")
      .eq("church_id", churchId)
      .eq("status", "active")
      .order("display_name", { ascending: true, nullsFirst: false })
      .order("full_name", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((member) => ({
      id: member.id,
      displayName: getPreferredName(member),
    }));
  } catch {
    return [];
  }
}

export async function getChatRoomsForMember(churchId?: string | null, memberId?: string | null): Promise<ChatRoomListItem[]> {
  if (!hasAdminEnvironment() || !churchId || !memberId) {
    return [];
  }

  try {
    const admin = createAdminClient();
    const { data: memberships, error: membershipError } = await admin
      .from("chat_room_members")
      .select("room_id, room:chat_rooms(id, title, description, last_message_at, created_at)")
      .eq("member_id", memberId);

    if (membershipError || !memberships?.length) {
      return [];
    }

    const roomIds = memberships
      .map((membership) => membership.room_id)
      .filter((value): value is string => Boolean(value));

    const [{ data: messages }, { data: counts }] = await Promise.all([
      admin
        .from("chat_messages")
        .select("id, room_id, body, created_at")
        .in("room_id", roomIds)
        .order("created_at", { ascending: false }),
      admin
        .from("chat_room_members")
        .select("room_id")
        .in("room_id", roomIds),
    ]);

    const lastMessageByRoom = new Map<string, { body: string; created_at: string }>();
    for (const message of messages ?? []) {
      if (!lastMessageByRoom.has(message.room_id)) {
        lastMessageByRoom.set(message.room_id, {
          body: message.body,
          created_at: message.created_at,
        });
      }
    }

    const memberCountByRoom = new Map<string, number>();
    for (const row of counts ?? []) {
      memberCountByRoom.set(row.room_id, (memberCountByRoom.get(row.room_id) ?? 0) + 1);
    }

    const items = memberships
      .map((membership) => {
        const room = Array.isArray(membership.room) ? membership.room[0] : membership.room;

        if (!room || room.id == null) {
          return null;
        }

        const lastMessage = lastMessageByRoom.get(room.id);
        return {
          id: room.id,
          title: room.title,
          description: room.description ?? null,
          lastMessageText: lastMessage?.body ?? null,
          lastMessageAt: lastMessage?.created_at ?? room.last_message_at ?? room.created_at ?? null,
          memberCount: memberCountByRoom.get(room.id) ?? 0,
        } satisfies ChatRoomListItem;
      })
      .filter((item): item is ChatRoomListItem => Boolean(item));

    return items.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  } catch {
    return [];
  }
}

export async function getChatRoomDetailForMember(args: {
  roomId: string;
  churchId?: string | null;
  memberId?: string | null;
}): Promise<ChatRoomDetail | null> {
  const { roomId, churchId, memberId } = args;

  if (!hasAdminEnvironment() || !churchId || !memberId) {
    return null;
  }

  try {
    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("chat_room_members")
      .select("room_id")
      .eq("room_id", roomId)
      .eq("member_id", memberId)
      .maybeSingle();

    if (!membership) {
      return null;
    }

    const [{ data: room }, { data: members }, { data: messages }] = await Promise.all([
      admin
        .from("chat_rooms")
        .select("id, title, description")
        .eq("id", roomId)
        .eq("church_id", churchId)
        .maybeSingle(),
      admin
        .from("chat_room_members")
        .select("member_id, member:members!chat_room_members_member_id_fkey(id, display_name, full_name)")
        .eq("room_id", roomId),
      admin
        .from("chat_messages")
        .select("id, body, created_at, sender_member_id, sender:members!chat_messages_sender_member_id_fkey(display_name, full_name)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true }),
    ]);

    if (!room) {
      return null;
    }

    const roomMembers = (members ?? []).map((item) => {
      const member = Array.isArray(item.member) ? item.member[0] : item.member;
      return {
        id: item.member_id,
        displayName: member ? getPreferredName(member) : "Member",
      };
    });

    return {
      id: room.id,
      title: room.title,
      description: room.description ?? null,
      memberCount: roomMembers.length,
      members: roomMembers,
      messages: (messages ?? []).map((message) => {
        const sender = Array.isArray(message.sender) ? message.sender[0] : message.sender;
        return {
          id: message.id,
          body: message.body,
          createdAt: message.created_at,
          senderId: message.sender_member_id ?? null,
          senderName: sender ? getPreferredName(sender) : "Member",
          isOwnMessage: message.sender_member_id === memberId,
        };
      }),
    };
  } catch {
    return null;
  }
}
