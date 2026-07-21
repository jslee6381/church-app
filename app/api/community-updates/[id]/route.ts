import { NextResponse } from "next/server";
import { getMemberRoles } from "@/lib/auth/authorization";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { removePublicImage, uploadPublicImage } from "@/lib/storage";

const CONTENT_LIMIT = 150;
const MAX_IMAGES = 10;

type ImageOrderEntry =
  | {
      kind: "existing";
      url: string;
      index: number;
    }
  | {
      kind: "new";
      index: number;
      uploadIndex: number;
    };

function normalizeText(value: string) {
  return value.trim().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const summary = String(formData.get("summary") ?? "");
    const imageOrderRaw = String(formData.get("imageOrder") ?? "[]");
    const newImages = formData.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
    const normalizedSummary = normalizeText(summary ?? "");
    const imageOrder = JSON.parse(imageOrderRaw) as ImageOrderEntry[];
    const roles = await getMemberRoles(session.member.id);
    const canManageAll = roles.includes("admin") || roles.includes("leader");

    if (normalizedSummary.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the content under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    if (imageOrder.length > MAX_IMAGES || newImages.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Please upload up to ${MAX_IMAGES} images.` }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        message: "Your update was published.",
        update: {
          id,
          summary: normalizedSummary,
          body: normalizedSummary,
          imageUrls: [],
          status: "approved",
        },
      });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("community_updates")
      .select("id, author_member_id, image_url")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    const { data: existingImageRows, error: existingImagesError } = await admin
      .from("community_update_images")
      .select("id, image_url, sort_order")
      .eq("community_update_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (!existing) {
      return NextResponse.json({ error: "Community update not found." }, { status: 404 });
    }

    if (existingImagesError) {
      return NextResponse.json({ error: existingImagesError.message }, { status: 500 });
    }

    if (!canManageAll && existing.author_member_id !== session.member.id) {
      return NextResponse.json({ error: "You can only edit your own community updates." }, { status: 403 });
    }

    const currentImageUrls = (existingImageRows ?? []).map((row) => row.image_url);
    const fallbackImageUrls = currentImageUrls.length > 0 ? currentImageUrls : existing.image_url ? [existing.image_url] : [];
    const allowedExistingUrls = new Set(fallbackImageUrls);

    const retainedExistingUrls = imageOrder
      .filter((entry): entry is Extract<ImageOrderEntry, { kind: "existing" }> => entry.kind === "existing")
      .map((entry) => entry.url)
      .filter((url) => allowedExistingUrls.has(url));

    if (retainedExistingUrls.length + newImages.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Please upload up to ${MAX_IMAGES} images.` }, { status: 400 });
    }

    const uploadedNewImageUrls = await Promise.all(newImages.map((image) => uploadPublicImage(image, "community-updates")));
    const finalImageUrls = imageOrder
      .map((entry) => {
        if (entry.kind === "existing") {
          return allowedExistingUrls.has(entry.url) ? entry.url : null;
        }

        return uploadedNewImageUrls[entry.uploadIndex] ?? null;
      })
      .filter((value): value is string => Boolean(value));

    if (finalImageUrls.length === 0 && retainedExistingUrls.length === 0 && uploadedNewImageUrls.length === 0 && imageOrder.length === 0) {
      // Keep zero images when the editor intentionally removes everything.
    }

    const removedImageUrls = fallbackImageUrls.filter((url) => !finalImageUrls.includes(url));

    const { data, error } = await admin
      .from("community_updates")
      .update({
        title: null,
        summary: normalizedSummary,
        body: normalizedSummary,
        image_url: finalImageUrls[0] ?? null,
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by_member_id: session.member.id,
        published_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, title, summary, body, status")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to update community update." }, { status: 500 });
    }

    const { error: deleteRowsError } = await admin.from("community_update_images").delete().eq("community_update_id", id);

    if (deleteRowsError) {
      return NextResponse.json({ error: deleteRowsError.message }, { status: 500 });
    }

    if (finalImageUrls.length > 0) {
      const { error: insertImagesError } = await admin.from("community_update_images").insert(
        finalImageUrls.map((imageUrl, index) => ({
          community_update_id: id,
          image_url: imageUrl,
          sort_order: index,
        })),
      );

      if (insertImagesError) {
        return NextResponse.json({ error: insertImagesError.message }, { status: 500 });
      }
    }

    await Promise.all(removedImageUrls.map((imageUrl) => removePublicImage(imageUrl)));

    return NextResponse.json({
      success: true,
      message: "Your update was published.",
      update: {
        ...data,
        imageUrls: finalImageUrls,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to update community update." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google first." }, { status: 401 });
    }

    const { id } = await params;
    const roles = await getMemberRoles(session.member.id);
    const canManageAll = roles.includes("admin") || roles.includes("leader");

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        message: "Community update deleted.",
      });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("community_updates")
      .select("id, author_member_id")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Community update not found." }, { status: 404 });
    }

    if (!canManageAll && existing.author_member_id !== session.member.id) {
      return NextResponse.json({ error: "You can only delete your own community updates." }, { status: 403 });
    }

    const { error } = await admin.from("community_updates").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Community update deleted.",
    });
  } catch {
    return NextResponse.json({ error: "Unable to delete community update." }, { status: 500 });
  }
}
