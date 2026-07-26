import "server-only";

import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { getYouTubeThumbnailUrl, getYouTubeWatchUrl } from "@/lib/youtube";

export type VideoPostListItem = {
  id: string;
  title: string;
  body: string | null;
  scheduledAt: string;
  messengerName: string;
  passageBook: string;
  passageStartChapter: number;
  passageStartVerse: number;
  passageEndChapter: number;
  passageEndVerse: number;
  videoLink: string;
  thumbnailUrl: string;
  watchUrl: string;
  questionDocUrl: string | null;
  questionDocName: string | null;
  manuscriptDocUrl: string | null;
  manuscriptDocName: string | null;
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
      .select(
        "id, title, body, scheduled_at, messenger_name, passage_book, passage_start_chapter, passage_start_verse, passage_end_chapter, passage_end_verse, video_link, question_doc_url, question_doc_name, manuscript_doc_url, manuscript_doc_name, created_at",
      )
      .eq("church_id", churchId)
      .order("scheduled_at", { ascending: false })
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
          scheduledAt: item.scheduled_at,
          messengerName: item.messenger_name,
          passageBook: item.passage_book,
          passageStartChapter: item.passage_start_chapter,
          passageStartVerse: item.passage_start_verse,
          passageEndChapter: item.passage_end_chapter,
          passageEndVerse: item.passage_end_verse,
          videoLink: item.video_link,
          thumbnailUrl,
          watchUrl,
          questionDocUrl: item.question_doc_url ?? null,
          questionDocName: item.question_doc_name ?? null,
          manuscriptDocUrl: item.manuscript_doc_url ?? null,
          manuscriptDocName: item.manuscript_doc_name ?? null,
          createdAt: item.created_at ?? null,
        };
      })
      .filter((item): item is VideoPostListItem => Boolean(item));
  } catch {
    return [];
  }
}
