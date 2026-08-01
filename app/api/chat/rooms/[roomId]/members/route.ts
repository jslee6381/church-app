import { NextResponse } from "next/server";

import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import {
  getAvailableChatCandidatesForRoom,
  getChatRoomMembersForMember,
} from "@/lib/chat";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

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

  return error?.message ?? "Unable to update members.";
}

export async function GET(
  _request: Request,
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
    const [members, candidates] = await Promise.all([
      getChatRoomMembersForMember({
        roomId,
        churchId: session.member.church_id,
        memberId: session.member.id,
      }),
      getAvailableChatCandidatesForRoom({
        roomId,
        churchId: session.member.church_id,
        memberId: session.member.id,
      }),
    ]);

    return NextResponse.json({ members, candidates });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load members." },
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
    const payload = (await request.json()) as { memberIds?: string[] };
    const memberIds = [...new Set((Array.isArray(payload.memberIds) ? payload.memberIds : []).filter((value): value is string => typeof value === "string" && value.length > 0))];

    if (memberIds.length === 0) {
      return NextResponse.json({ error: "Please select at least one member." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: room } = await admin
      .from("chat_rooms")
      .select("id, church_id")
      .eq("id", roomId)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!room) {
      return NextResponse.json({ error: "Chat room not found." }, { status: 404 });
    }

    const { data: activeMembers, error: membersError } = await admin
      .from("members")
      .select("id")
      .eq("church_id", session.member.church_id)
      .eq("status", "active")
      .in("id", memberIds);

    if (membersError) {
      return NextResponse.json({ error: "Unable to verify room members." }, { status: 500 });
    }

    const verifiedIds = new Set((activeMembers ?? []).map((member) => member.id));
    const insertRows = memberIds
      .filter((memberId) => verifiedIds.has(memberId))
      .map((memberId) => ({
        room_id: roomId,
        member_id: memberId,
        role: "member" as const,
        unread_count: 0,
      }));

    if (insertRows.length === 0) {
      return NextResponse.json({ error: "No valid members were selected." }, { status: 400 });
    }

    const { error: insertError } = await admin
      .from("chat_room_members")
      .upsert(insertRows, {
        onConflict: "room_id,member_id",
        ignoreDuplicates: true,
      });

    if (insertError) {
      return NextResponse.json({ error: getChatSetupErrorMessage(insertError) }, { status: 500 });
    }

    const [members, candidates] = await Promise.all([
      getChatRoomMembersForMember({
        roomId,
        churchId: session.member.church_id,
        memberId: session.member.id,
      }),
      getAvailableChatCandidatesForRoom({
        roomId,
        churchId: session.member.church_id,
        memberId: session.member.id,
      }),
    ]);

    return NextResponse.json({ success: true, members, candidates });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update members." },
      { status: 500 },
    );
  }
}
