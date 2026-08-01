import { NextResponse } from "next/server";

import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

function normalizeText(value: string) {
  return value.trim().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

function getChatSetupErrorMessage(error?: { message?: string | null } | null) {
  const message = error?.message ?? "";

  if (
    message.includes("public.chat_rooms")
    || message.includes("public.chat_room_members")
    || message.includes("public.chat_messages")
    || message.includes("schema cache")
  ) {
    return "Chat is not set up in the database yet. Please apply the latest Supabase migration.";
  }

  return error?.message ?? "Unable to update message.";
}

async function syncRoomLastMessageSummary(admin: ReturnType<typeof createAdminClient>, roomId: string) {
  const { data: latestMessage } = await admin
    .from("chat_messages")
    .select("body, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await admin
    .from("chat_rooms")
    .update({
      last_message_at: latestMessage?.created_at ?? null,
      last_message_text: latestMessage?.body ?? null,
    })
    .eq("id", roomId);
}

function mapMessage(message: {
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
}, memberId: string) {
  const sender = Array.isArray(message.sender) ? message.sender[0] : message.sender;
  const profile = Array.isArray(sender?.profiles) ? sender.profiles[0] : sender?.profiles;

  return {
    id: message.id,
    body: message.body,
    createdAt: message.created_at,
    editedAt: message.edited_at ?? null,
    deletedAt: message.deleted_at ?? null,
    senderId: message.sender_member_id ?? null,
    senderName: sender?.display_name?.trim() || sender?.full_name?.trim() || "Member",
    senderPhotoUrl: profile?.profile_photo_url ?? null,
    isOwnMessage: message.sender_member_id === memberId,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string; messageId: string }> },
) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    if (session.member.status !== "active") {
      return NextResponse.json({ error: "Your member access is still awaiting approval." }, { status: 403 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({ error: "Chat is unavailable right now." }, { status: 503 });
    }

    const { roomId, messageId } = await params;
    const payload = (await request.json()) as { body?: string };
    const body = normalizeText(String(payload.body ?? ""));

    if (!body) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: current } = await admin
      .from("chat_messages")
      .select("id, room_id, sender_member_id, deleted_at")
      .eq("id", messageId)
      .eq("room_id", roomId)
      .maybeSingle();

    if (!current || current.sender_member_id !== session.member.id) {
      return NextResponse.json({ error: "You can only edit your own message." }, { status: 403 });
    }

    if (current.deleted_at) {
      return NextResponse.json({ error: "Deleted messages cannot be edited." }, { status: 400 });
    }

    const { data: message, error } = await admin
      .from("chat_messages")
      .update({
        body,
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .eq("room_id", roomId)
      .eq("sender_member_id", session.member.id)
      .select("id, body, created_at, edited_at, deleted_at, sender_member_id, sender:members!chat_messages_sender_member_id_fkey(display_name, full_name, profiles!left(profile_photo_url))")
      .single();

    if (error || !message) {
      return NextResponse.json({ error: getChatSetupErrorMessage(error) }, { status: 500 });
    }

    await syncRoomLastMessageSummary(admin, roomId);

    return NextResponse.json({
      success: true,
      message: mapMessage(message, session.member.id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to edit message." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ roomId: string; messageId: string }> },
) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    if (session.member.status !== "active") {
      return NextResponse.json({ error: "Your member access is still awaiting approval." }, { status: 403 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({ error: "Chat is unavailable right now." }, { status: 503 });
    }

    const { roomId, messageId } = await params;
    const admin = createAdminClient();
    const { data: current } = await admin
      .from("chat_messages")
      .select("id, room_id, sender_member_id, deleted_at")
      .eq("id", messageId)
      .eq("room_id", roomId)
      .maybeSingle();

    if (!current || current.sender_member_id !== session.member.id) {
      return NextResponse.json({ error: "You can only delete your own message." }, { status: 403 });
    }

    if (current.deleted_at) {
      return NextResponse.json({ error: "Message is already deleted." }, { status: 400 });
    }

    const { data: message, error } = await admin
      .from("chat_messages")
      .update({
        body: "This message was deleted.",
        deleted_at: new Date().toISOString(),
        edited_at: null,
      })
      .eq("id", messageId)
      .eq("room_id", roomId)
      .eq("sender_member_id", session.member.id)
      .select("id, body, created_at, edited_at, deleted_at, sender_member_id, sender:members!chat_messages_sender_member_id_fkey(display_name, full_name, profiles!left(profile_photo_url))")
      .single();

    if (error || !message) {
      return NextResponse.json({ error: getChatSetupErrorMessage(error) }, { status: 500 });
    }

    await syncRoomLastMessageSummary(admin, roomId);

    return NextResponse.json({
      success: true,
      message: mapMessage(message, session.member.id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete message." },
      { status: 500 },
    );
  }
}
