import "server-only";

import type { GoogleDriveGalleryImage } from "@/lib/google-drive-gallery";
import { getEmbeddedGoogleDriveFolderUrl } from "@/lib/google-drive-public";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export type GalleryPostListItem = {
  id: string;
  title: string;
  body: string | null;
  driveLink: string;
  embedUrl: string;
  images: GoogleDriveGalleryImage[];
  createdAt: string | null;
};

export async function getGalleryPosts(churchId?: string | null): Promise<GalleryPostListItem[]> {
  if (!hasAdminEnvironment() || !churchId) {
    return [];
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("gallery_posts")
      .select("id, title, body, drive_link, preview_images, created_at")
      .eq("church_id", churchId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    const items: Array<GalleryPostListItem | null> = data.map((item) => {
      const embedUrl = getEmbeddedGoogleDriveFolderUrl(item.drive_link, "grid");

      if (!embedUrl) {
        return null;
      }

      return {
        id: item.id,
        title: item.title,
        body: item.body ?? null,
        driveLink: item.drive_link,
        embedUrl,
        images: Array.isArray(item.preview_images) ? (item.preview_images as GoogleDriveGalleryImage[]) : [],
        createdAt: item.created_at ?? null,
      };
    });

    return items
      .filter((item): item is GalleryPostListItem => Boolean(item));
  } catch {
    return [];
  }
}
