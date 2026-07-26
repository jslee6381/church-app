import "server-only";

import type { BibleVerse } from "@/lib/bible";
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
  passageVerses: BibleVerse[] | null;
  videoLink: string | null;
  thumbnailUrl: string | null;
  watchUrl: string | null;
  questionDocUrl: string | null;
  questionDocName: string | null;
  questionDocText: string | null;
  manuscriptDocUrl: string | null;
  manuscriptDocName: string | null;
  manuscriptDocText: string | null;
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
        "id, title, body, scheduled_at, messenger_name, passage_book, passage_start_chapter, passage_start_verse, passage_end_chapter, passage_end_verse, passage_verses, video_link, question_doc_url, question_doc_name, question_doc_text, manuscript_doc_url, manuscript_doc_name, manuscript_doc_text, created_at",
      )
      .eq("church_id", churchId)
      .order("scheduled_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data
      .map((item) => {
        const thumbnailUrl = item.video_link ? getYouTubeThumbnailUrl(item.video_link) : null;
        const watchUrl = item.video_link ? getYouTubeWatchUrl(item.video_link) : null;

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
          passageVerses: Array.isArray(item.passage_verses) ? (item.passage_verses as BibleVerse[]) : null,
          videoLink: item.video_link ?? null,
          thumbnailUrl,
          watchUrl,
          questionDocUrl: item.question_doc_url ?? null,
          questionDocName: item.question_doc_name ?? null,
          questionDocText: item.question_doc_text ?? null,
          manuscriptDocUrl: item.manuscript_doc_url ?? null,
          manuscriptDocName: item.manuscript_doc_name ?? null,
          manuscriptDocText: item.manuscript_doc_text ?? null,
          createdAt: item.created_at ?? null,
        };
      })
      .filter((item): item is VideoPostListItem => Boolean(item));
  } catch {
    return [];
  }
}

export async function getVideoPostById(postId: string, churchId?: string | null) {
  if (!hasAdminEnvironment() || !churchId) {
    return null;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("video_posts")
      .select(
        "id, title, body, scheduled_at, messenger_name, passage_book, passage_start_chapter, passage_start_verse, passage_end_chapter, passage_end_verse, passage_verses, video_link, question_doc_url, question_doc_name, question_doc_text, manuscript_doc_url, manuscript_doc_name, manuscript_doc_text, created_at",
      )
      .eq("id", postId)
      .eq("church_id", churchId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const thumbnailUrl = data.video_link ? getYouTubeThumbnailUrl(data.video_link) : null;
    const watchUrl = data.video_link ? getYouTubeWatchUrl(data.video_link) : null;

    return {
      id: data.id,
      title: data.title,
      body: data.body ?? null,
      scheduledAt: data.scheduled_at,
      messengerName: data.messenger_name,
      passageBook: data.passage_book,
      passageStartChapter: data.passage_start_chapter,
      passageStartVerse: data.passage_start_verse,
      passageEndChapter: data.passage_end_chapter,
      passageEndVerse: data.passage_end_verse,
      passageVerses: Array.isArray(data.passage_verses) ? (data.passage_verses as BibleVerse[]) : null,
      videoLink: data.video_link ?? null,
      thumbnailUrl,
      watchUrl,
      questionDocUrl: data.question_doc_url ?? null,
      questionDocName: data.question_doc_name ?? null,
      questionDocText: data.question_doc_text ?? null,
      manuscriptDocUrl: data.manuscript_doc_url ?? null,
      manuscriptDocName: data.manuscript_doc_name ?? null,
      manuscriptDocText: data.manuscript_doc_text ?? null,
      createdAt: data.created_at ?? null,
    };
  } catch {
    return null;
  }
}
