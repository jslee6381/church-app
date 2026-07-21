import { NextResponse } from "next/server";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { uploadPublicImage } from "@/lib/storage";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

function normalizeText(value: string) {
  return value.trim().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

const CONTENT_LIMIT = 150;
const MAX_IMAGES = 10;

function getCurrentActivityDate() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 });
    }

    if (session.member.status !== "active") {
      return NextResponse.json({ error: "Your member access is still awaiting approval." }, { status: 403 });
    }

    const formData = await request.formData();
    const summary = normalizeText(String(formData.get("summary") ?? ""));
    const imageEntries = formData.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
    const legacyImage = formData.get("image");
    const images = imageEntries.length > 0 ? imageEntries : legacyImage instanceof File && legacyImage.size > 0 ? [legacyImage] : [];

    if (summary.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the content under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Please upload up to ${MAX_IMAGES} images.` }, { status: 400 });
    }

    let imageUrls: string[] = [];

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        message: "Your community update was published.",
      });
    }

    if (images.length > 0) {
      imageUrls = await Promise.all(images.map((image) => uploadPublicImage(image, "community-updates")));
    }

    const admin = createAdminClient();
    const { data: inserted, error } = await admin
      .from("community_updates")
      .insert({
        church_id: session.member.church_id,
        author_member_id: session.member.id,
        title: null,
        summary,
        body: summary,
        image_url: imageUrls[0] ?? null,
        activity_date: getCurrentActivityDate(),
        status: "approved",
        visibility: "members",
        approved_by_member_id: session.member.id,
        approved_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return NextResponse.json({ error: error?.message ?? "Unable to submit community update." }, { status: 500 });
    }

    if (imageUrls.length > 0) {
      const { error: imagesError } = await admin.from("community_update_images").insert(
        imageUrls.map((imageUrl, index) => ({
          community_update_id: inserted.id,
          image_url: imageUrl,
          sort_order: index,
        })),
      );

      if (imagesError) {
        return NextResponse.json({ error: imagesError.message }, { status: 500 });
      }
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "community_updates",
      action: "create",
      metadata: {
        status: "approved",
        imageCount: imageUrls.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your community update was published.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit community update." },
      { status: 500 },
    );
  }
}
