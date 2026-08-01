import { NextResponse } from "next/server";

import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 180;

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

  return error?.message ?? "Unable to create chat room.";
}

export async function POST(request: Request) {
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

    const payload = (await request.json()) as {
      title?: string;
      description?: string;
      memberIds?: string[];
    };

    const title = normalizeText(String(payload.title ?? ""));
    const description = normalizeText(String(payload.description ?? ""));
    const rawMemberIds = Array.isArray(payload.memberIds) ? payload.memberIds : [];
    const memberIds = [...new Set(rawMemberIds.filter((value): value is string => typeof value === "string" && value.length > 0))];

    if (!title) {
      return NextResponse.json({ error: "Room name is required." }, { status: 400 });
    }

    if (title.length > TITLE_LIMIT) {
      return NextResponse.json({ error: `Room name must be ${TITLE_LIMIT} characters or less.` }, { status: 400 });
    }

    if (description.length > DESCRIPTION_LIMIT) {
      return NextResponse.json({ error: `Description must be ${DESCRIPTION_LIMIT} characters or less.` }, { status: 400 });
    }

    const admin = createAdminClient();
    const participantIds = [...new Set([session.member.id, ...memberIds])];

    const { data: activeMembers, error: membersError } = await admin
      .from("members")
      .select("id")
      .eq("church_id", session.member.church_id)
      .eq("status", "active")
      .in("id", participantIds);

    if (membersError) {
      return NextResponse.json({ error: "Unable to verify room members." }, { status: 500 });
    }

    const verifiedIds = new Set((activeMembers ?? []).map((member) => member.id));

    if (!verifiedIds.has(session.member.id)) {
      return NextResponse.json({ error: "Unable to verify your member access." }, { status: 403 });
    }

    const { data: room, error: roomError } = await admin
      .from("chat_rooms")
      .insert({
        church_id: session.member.church_id,
        title,
        description: description || null,
        created_by_member_id: session.member.id,
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: getChatSetupErrorMessage(roomError) }, { status: 500 });
    }

    const roomMembers = participantIds
      .filter((memberId) => verifiedIds.has(memberId))
      .map((memberId) => ({
        room_id: room.id,
        member_id: memberId,
        role: memberId === session.member.id ? "owner" : "member",
      }));

    const { error: membershipError } = await admin
      .from("chat_room_members")
      .insert(roomMembers);

    if (membershipError) {
      await admin.from("chat_rooms").delete().eq("id", room.id);
      return NextResponse.json({ error: getChatSetupErrorMessage(membershipError) }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "chat_rooms",
      action: "create",
      metadata: {
        roomId: room.id,
      },
    });

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create chat room." },
      { status: 500 },
    );
  }
}
