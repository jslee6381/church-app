import { NextResponse } from "next/server";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { removePublicImage, uploadPublicImage } from "@/lib/storage";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const formData = await request.formData();
    const photo = formData.get("photo");

    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json({ error: "Please choose a photo to upload." }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        photoUrl: null,
      });
    }

    const photoUrl = await uploadPublicImage(photo, "profiles");
    const admin = createAdminClient();

    const { error } = await admin.from("profiles").upsert(
      {
        member_id: session.member.id,
        profile_photo_url: photoUrl,
      },
      {
        onConflict: "member_id",
      },
    );

    if (error) {
      if (error.message.includes("public.profiles")) {
        return NextResponse.json(
          { error: "The profiles table has not been created in Supabase yet. Please run the latest SQL migration first." },
          { status: 500 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      photoUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload profile photo." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        photoUrl: null,
      });
    }

    const admin = createAdminClient();
    const { data: existingProfile, error: profileError } = await admin
      .from("profiles")
      .select("profile_photo_url")
      .eq("member_id", session.member.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    await removePublicImage(existingProfile?.profile_photo_url);

    const { error } = await admin.from("profiles").upsert(
      {
        member_id: session.member.id,
        profile_photo_url: null,
      },
      {
        onConflict: "member_id",
      },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      photoUrl: null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove profile photo." },
      { status: 500 },
    );
  }
}
