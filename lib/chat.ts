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
  imageUrl: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  memberCount: number;
  unreadCount: number;
};

export type ChatRoomMessage = {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  senderId: string | null;
  senderName: string;
  senderPhotoUrl: string | null;
  isOwnMessage: boolean;
};

export type ChatRoomMember = {
  id: string;
  displayName: string;
  role: "owner" | "member";
};

export type ChatRoomDetail = {
  id: string;
  title: string;
  description: string | null;
  memberCount: number;
  lastReadMessageId: string | null;
  hasOlderMessages: boolean;
  messages: ChatRoomMessage[];
};

export const CHAT_ROOM_RECENT_MESSAGE_LIMIT = 40;

function getPreferredName(member: {
  display_name?: string | null;
  full_name?: string | null;
}) {
  return member.display_name?.trim() || member.full_name?.trim() || "Member";
}

function mapChatMessage(
  message: {
    id: string;
    body: string;
    created_at: string;
    edited_at?: string | null;
    deleted_at?: string | null;
    sender_member_id?: string | null;
    sender?: {
      display_name?: string | null;
      full_name?: string | null;
      profiles?: { profile_photo_url?: string | null }[] | { profile_photo_url?: string | null } | null;
    } | {
      display_name?: string | null;
      full_name?: string | null;
      profiles?: { profile_photo_url?: string | null }[] | { profile_photo_url?: string | null } | null;
    }[] | null;
  },
  memberId?: string | null,
): ChatRoomMessage {
  const sender = Array.isArray(message.sender) ? message.sender[0] : message.sender;
  const profile = Array.isArray(sender?.profiles) ? sender.profiles[0] : sender?.profiles;

  return {
    id: message.id,
    body: message.body,
    createdAt: message.created_at,
    editedAt: message.edited_at ?? null,
    deletedAt: message.deleted_at ?? null,
    senderId: message.sender_member_id ?? null,
    senderName: sender ? getPreferredName(sender) : "Member",
    senderPhotoUrl: profile?.profile_photo_url ?? null,
    isOwnMessage: message.sender_member_id === memberId,
  };
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
      .select("room_id, unread_count, room:chat_rooms(id, title, description, image_url, last_message_text, last_message_at, created_at)")
      .eq("member_id", memberId);

    if (membershipError || !memberships?.length) {
      return [];
    }

    const roomIds = memberships
      .map((membership) => membership.room_id)
      .filter((value): value is string => Boolean(value));

    const { data: counts } = await admin
      .from("chat_room_members")
      .select("room_id")
      .in("room_id", roomIds);

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

        return {
          id: room.id,
          title: room.title,
          description: room.description ?? null,
          imageUrl: room.image_url ?? null,
          lastMessageText: room.last_message_text ?? null,
          lastMessageAt: room.last_message_at ?? room.created_at ?? null,
          memberCount: memberCountByRoom.get(room.id) ?? 0,
          unreadCount: membership.unread_count ?? 0,
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
      .select("room_id, last_read_message_id")
      .eq("room_id", roomId)
      .eq("member_id", memberId)
      .maybeSingle();

    if (!membership) {
      return null;
    }

    const [{ data: room }, { count: memberCount }, { data: messages }] = await Promise.all([
      admin
        .from("chat_rooms")
        .select("id, title, description")
        .eq("id", roomId)
        .eq("church_id", churchId)
        .maybeSingle(),
      admin
        .from("chat_room_members")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId),
      admin
        .from("chat_messages")
        .select("id, body, created_at, edited_at, deleted_at, sender_member_id, sender:members!chat_messages_sender_member_id_fkey(display_name, full_name, profiles!left(profile_photo_url))")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(CHAT_ROOM_RECENT_MESSAGE_LIMIT),
    ]);

    if (!room) {
      return null;
    }

    return {
      id: room.id,
      title: room.title,
      description: room.description ?? null,
      memberCount: memberCount ?? 0,
      lastReadMessageId: membership.last_read_message_id ?? null,
      hasOlderMessages: (messages?.length ?? 0) >= CHAT_ROOM_RECENT_MESSAGE_LIMIT,
      messages: [...(messages ?? [])].reverse().map((message) => mapChatMessage(message, memberId)),
    };
  } catch {
    return null;
  }
}

export async function getOlderChatMessagesForMember(args: {
  roomId: string;
  churchId?: string | null;
  memberId?: string | null;
  beforeCreatedAt?: string | null;
  limit?: number;
}): Promise<{ messages: ChatRoomMessage[]; hasOlderMessages: boolean }> {
  const { roomId, churchId, memberId, beforeCreatedAt, limit = 30 } = args;

  if (!hasAdminEnvironment() || !churchId || !memberId || !beforeCreatedAt) {
    return { messages: [], hasOlderMessages: false };
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
      return { messages: [], hasOlderMessages: false };
    }

    const { data } = await admin
      .from("chat_messages")
      .select("id, body, created_at, edited_at, deleted_at, sender_member_id, sender:members!chat_messages_sender_member_id_fkey(display_name, full_name, profiles!left(profile_photo_url))")
      .eq("room_id", roomId)
      .lt("created_at", beforeCreatedAt)
      .order("created_at", { ascending: false })
      .limit(limit);

    const messages = [...(data ?? [])].reverse().map((message) => mapChatMessage(message, memberId));

    return {
      messages,
      hasOlderMessages: (data?.length ?? 0) >= limit,
    };
  } catch {
    return { messages: [], hasOlderMessages: false };
  }
}

export async function getNewerChatMessagesForMember(args: {
  roomId: string;
  churchId?: string | null;
  memberId?: string | null;
  afterCreatedAt?: string | null;
  limit?: number;
}): Promise<ChatRoomMessage[]> {
  const { roomId, churchId, memberId, afterCreatedAt, limit = 30 } = args;

  if (!hasAdminEnvironment() || !churchId || !memberId || !afterCreatedAt) {
    return [];
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
      return [];
    }

    const { data } = await admin
      .from("chat_messages")
      .select("id, body, created_at, edited_at, deleted_at, sender_member_id, sender:members!chat_messages_sender_member_id_fkey(display_name, full_name, profiles!left(profile_photo_url))")
      .eq("room_id", roomId)
      .gt("created_at", afterCreatedAt)
      .order("created_at", { ascending: true })
      .limit(limit);

    return (data ?? []).map((message) => mapChatMessage(message, memberId));
  } catch {
    return [];
  }
}

export async function getChatRoomMembersForMember(args: {
  roomId: string;
  churchId?: string | null;
  memberId?: string | null;
}): Promise<ChatRoomMember[]> {
  const { roomId, churchId, memberId } = args;

  if (!hasAdminEnvironment() || !churchId || !memberId) {
    return [];
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
      return [];
    }

    const { data, error } = await admin
      .from("chat_room_members")
      .select("member_id, role, member:members!chat_room_members_member_id_fkey(display_name, full_name)")
      .eq("room_id", roomId);

    if (error || !data) {
      return [];
    }

    return data.map((item) => {
      const member = Array.isArray(item.member) ? item.member[0] : item.member;
      return {
        id: item.member_id,
        displayName: member ? getPreferredName(member) : "Member",
        role: item.role,
      };
    }).sort((a, b) => {
      if (a.role !== b.role) {
        return a.role === "owner" ? -1 : 1;
      }

      return a.displayName.localeCompare(b.displayName);
    });
  } catch {
    return [];
  }
}

export async function getAvailableChatCandidatesForRoom(args: {
  roomId: string;
  churchId?: string | null;
  memberId?: string | null;
}): Promise<ChatCandidateMember[]> {
  const { roomId, churchId, memberId } = args;

  if (!hasAdminEnvironment() || !churchId || !memberId) {
    return [];
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
      return [];
    }

    const [members, candidates] = await Promise.all([
      admin
        .from("chat_room_members")
        .select("member_id")
        .eq("room_id", roomId),
      admin
        .from("members")
        .select("id, display_name, full_name")
        .eq("church_id", churchId)
        .eq("status", "active")
        .order("display_name", { ascending: true, nullsFirst: false })
        .order("full_name", { ascending: true }),
    ]);

    const existingIds = new Set((members.data ?? []).map((row) => row.member_id));

    return (candidates.data ?? [])
      .filter((candidate) => !existingIds.has(candidate.id))
      .map((candidate) => ({
        id: candidate.id,
        displayName: getPreferredName(candidate),
      }));
  } catch {
    return [];
  }
}
