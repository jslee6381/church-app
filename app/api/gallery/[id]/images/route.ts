import { NextResponse } from "next/server";

import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getDefaultChurchId } from "@/lib/church-context";
import { getGoogleDriveGalleryImages } from "@/lib/google-drive-gallery";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!hasAdminEnvironment()) {
      return NextResponse.json({ images: [] });
    }

    const session = await getAuthenticatedMemberSession();
    const churchId = session?.member.church_id ?? (await getDefaultChurchId());

    if (!churchId) {
      return NextResponse.json({ images: [] });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("gallery_posts")
      .select("drive_link, preview_images")
      .eq("id", id)
      .eq("church_id", churchId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Gallery post not found." }, { status: 404 });
    }

    if (Array.isArray(data.preview_images) && data.preview_images.length > 0) {
      return NextResponse.json({ images: data.preview_images });
    }

    const images = await getGoogleDriveGalleryImages(data.drive_link);

    await admin
      .from("gallery_posts")
      .update({
        preview_images: images,
      })
      .eq("id", id)
      .eq("church_id", churchId);

    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load gallery images." },
      { status: 500 },
    );
  }
}
