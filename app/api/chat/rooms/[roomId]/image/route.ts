import { NextResponse } from "next/server";

import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { removePublicImage, uploadPublicImage } from "@/lib/storage";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

function getChatSetupErrorMessage(error?: { message?: string | null } | null) {
  const message = error?.message ?? "";

  if (
    message.includes("public.chat_rooms")
    || message.includes("public.chat_room_members")
    || message.includes("schema cache")
  ) {
    return "Chat is not set up in the database yet. Please apply the latest Supabase migration.";
  }

  return error?.message ?? "Unable to update chat image.";
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
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: "Please choose an image to upload." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: membership } = await admin
      .from("chat_room_members")
      .select("room_id, room:chat_rooms(id, church_id, image_url)")
      .eq("room_id", roomId)
      .eq("member_id", session.member.id)
      .maybeSingle();

    const room = Array.isArray(membership?.room) ? membership?.room[0] : membership?.room;

    if (!membership || !room || room.church_id !== session.member.church_id) {
      return NextResponse.json({ error: "Chat room not found." }, { status: 404 });
    }

    const nextImageUrl = await uploadPublicImage(image, "chat-rooms");

    const { error: updateError } = await admin
      .from("chat_rooms")
      .update({ image_url: nextImageUrl })
      .eq("id", roomId)
      .eq("church_id", session.member.church_id);

    if (updateError) {
      return NextResponse.json({ error: getChatSetupErrorMessage(updateError) }, { status: 500 });
    }

    if (room.image_url && room.image_url !== nextImageUrl) {
      await removePublicImage(room.image_url);
    }

    return NextResponse.json({
      success: true,
      imageUrl: nextImageUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update chat image." },
      { status: 500 },
    );
  }
}
