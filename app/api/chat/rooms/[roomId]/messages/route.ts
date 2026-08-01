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

  return error?.message ?? "Unable to send message.";
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
      .select("id")
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

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send message." },
      { status: 500 },
    );
  }
}
