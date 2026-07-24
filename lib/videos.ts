import "server-only";

import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { getYouTubeThumbnailUrl, getYouTubeWatchUrl } from "@/lib/youtube";

export type VideoPostListItem = {
  id: string;
  title: string;
  body: string | null;
  videoLink: string;
  thumbnailUrl: string;
  watchUrl: string;
  createdAt: string | null;
};

export async function getVideoPosts(churchId?: string | null): Promise<VideoPostListItem[]> {
  if (!hasAdminEnvironment() || !churchId) {
    return [];
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("video_posts")
      .select("id, title, body, video_link, created_at")
      .eq("church_id", churchId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data
      .map((item) => {
        const thumbnailUrl = getYouTubeThumbnailUrl(item.video_link);
        const watchUrl = getYouTubeWatchUrl(item.video_link);

        if (!thumbnailUrl || !watchUrl) {
          return null;
        }

        return {
          id: item.id,
          title: item.title,
          body: item.body ?? null,
          videoLink: item.video_link,
          thumbnailUrl,
          watchUrl,
          createdAt: item.created_at ?? null,
        };
      })
      .filter((item): item is VideoPostListItem => Boolean(item));
  } catch {
    return [];
  }
}
