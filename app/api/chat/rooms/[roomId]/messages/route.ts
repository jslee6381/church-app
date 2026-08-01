import { NextResponse } from "next/server";

import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getOlderChatMessagesForMember } from "@/lib/chat";
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

  return error?.message ?? "Unable to send message.";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    if (session.member.status !== "active") {
      return NextResponse.json({ error: "Your member access is still awaiting approval." }, { status: 403 });
    }

    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const beforeCreatedAt = searchParams.get("beforeCreatedAt");
    const limit = Number(searchParams.get("limit") ?? "30");

    const result = await getOlderChatMessagesForMember({
      roomId,
      churchId: session.member.church_id,
      memberId: session.member.id,
      beforeCreatedAt,
      limit: Number.isFinite(limit) ? limit : 30,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load messages." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
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

    const { roomId } = await params;
    const payload = (await request.json()) as { body?: string };
    const body = normalizeText(String(payload.body ?? ""));

    if (!body) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("chat_room_members")
      .select("room_id, room:chat_rooms(id, church_id)")
      .eq("room_id", roomId)
      .eq("member_id", session.member.id)
      .maybeSingle();

    const room = Array.isArray(membership?.room) ? membership?.room[0] : membership?.room;

    if (!membership || !room || room.church_id !== session.member.church_id) {
      return NextResponse.json({ error: "You do not have access to this chat room." }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { data: message, error: messageError } = await admin
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_member_id: session.member.id,
        message_type: "text",
        body,
      })
      .select("id, body, created_at, sender_member_id, sender:members!chat_messages_sender_member_id_fkey(display_name, full_name, profiles!left(profile_photo_url))")
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: getChatSetupErrorMessage(messageError) }, { status: 500 });
    }

    await admin
      .from("chat_rooms")
      .update({
        last_message_at: now,
      })
      .eq("id", roomId);

    await admin
      .from("chat_room_members")
      .update({
        last_read_message_id: message.id,
      })
      .eq("room_id", roomId)
      .eq("member_id", session.member.id);

    const sender = Array.isArray(message.sender) ? message.sender[0] : message.sender;
    const profile = Array.isArray(sender?.profiles) ? sender.profiles[0] : sender?.profiles;

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        body: message.body,
        createdAt: message.created_at,
        senderId: message.sender_member_id ?? null,
        senderName: sender?.display_name?.trim() || sender?.full_name?.trim() || "Member",
        senderPhotoUrl: profile?.profile_photo_url ?? null,
        isOwnMessage: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send message." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
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

    const { roomId } = await params;
    const payload = (await request.json()) as { lastReadMessageId?: string | null };
    const lastReadMessageId = typeof payload.lastReadMessageId === "string" && payload.lastReadMessageId.length > 0
      ? payload.lastReadMessageId
      : null;

    const admin = createAdminClient();
    await admin
      .from("chat_room_members")
      .update({
        last_read_message_id: lastReadMessageId,
      })
      .eq("room_id", roomId)
      .eq("member_id", session.member.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update read position." },
      { status: 500 },
    );
  }
}
