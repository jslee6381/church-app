import "server-only";

import { getEmbeddedGoogleDriveFolderUrl } from "@/lib/google-drive-public";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export type GalleryPostListItem = {
  id: string;
  title: string;
  body: string | null;
  driveLink: string;
  embedUrl: string;
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
      .select("id, title, body, drive_link, created_at")
      .eq("church_id", churchId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data
      .map((item) => {
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
          createdAt: item.created_at ?? null,
        };
      })
      .filter((item): item is GalleryPostListItem => Boolean(item));
  } catch {
    return [];
  }
}
