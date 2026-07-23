import "server-only";
import { socialPosts } from "@/lib/data";
import { formatEasternLongDate } from "@/lib/eastern-time";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export type ReactionKind = "heart" | "like" | "pray";

export type CommentReactionKind = "heart" | "like";

export type CommunityUpdateComment = {
  id: string;
  authorName: string;
  authorPhotoUrl: string | null;
  message: string;
  createdAtLabel: string;
  reactionCounts: Record<CommentReactionKind, number>;
  selectedReaction: CommentReactionKind | null;
  isOwner: boolean;
};

export type CommunityUpdateFeedItem = {
  id: string;
  legacyTitle?: string | null;
  summary: string;
  body: string | null;
  dateLabel: string;
  imageUrl: string | null;
  imageUrls: string[];
  reactionCounts: Record<ReactionKind, number>;
  selectedReaction: ReactionKind | null;
  authorName: string;
  authorPhotoUrl: string | null;
  comments: CommunityUpdateComment[];
  commentCount: number;
  isOwner: boolean;
  status: "pending" | "approved" | "rejected" | "archived";
};

function formatDate(value: string) {
  return formatEasternLongDate(value);
}

function getFallbackUpdates(): CommunityUpdateFeedItem[] {
  return socialPosts.map((post) => ({
    id: String(post.id),
    legacyTitle: null,
    summary: post.summary,
    body: post.summary,
    dateLabel: post.date,
    imageUrl: post.imageSrcs[0] ?? null,
    imageUrls: post.imageSrcs,
    reactionCounts: { heart: 0, like: 0, pray: 0 },
    selectedReaction: null,
    authorName: "KOINONIA",
    authorPhotoUrl: null,
    comments: [],
    commentCount: 0,
    isOwner: false,
    status: "approved",
  }));
}

export async function getCommunityUpdateFeed(churchId?: string | null, memberId?: string | null) {
  void memberId;

  if (!hasAdminEnvironment() || !churchId) {
    return getFallbackUpdates();
  }

  try {
    const admin = createAdminClient();
    const { data, error: approvedError } = await admin
      .from("community_updates")
      .select("id, title, summary, body, image_url, activity_date, published_at, author_member_id, status, author_member:members!community_updates_author_member_id_fkey(display_name, full_name)")
      .eq("church_id", churchId)
      .eq("status", "approved")
      .order("activity_date", { ascending: false, nullsFirst: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(12);

    if (approvedError) {
      return getFallbackUpdates();
    }

    if (!data || data.length === 0) {
      return [];
    }

    const ids = data.map((update) => update.id);
    const authorIds = data
      .map((update) => update.author_member_id)
      .filter((value): value is string => Boolean(value));
    const { data: reactions } = await admin
      .from("community_update_reactions")
      .select("community_update_id, member_id, reaction_kind")
      .in("community_update_id", ids);
    const { data: imageRows } = await admin
      .from("community_update_images")
      .select("community_update_id, image_url, sort_order")
      .in("community_update_id", ids)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    const { data: commentRows } = await admin
      .from("community_update_comments")
      .select("id, community_update_id, author_member_id, message, created_at, author_member:members!community_update_comments_author_member_id_fkey(display_name, full_name)")
      .in("community_update_id", ids)
      .order("created_at", { ascending: true });
    const commentIds = (commentRows ?? []).map((comment) => comment.id);
    const { data: commentReactions } =
      commentIds.length > 0
        ? await admin
            .from("community_update_comment_reactions")
            .select("community_update_comment_id, member_id, reaction_kind")
            .in("community_update_comment_id", commentIds)
        : { data: [] as never[] };
    const commentAuthorIds = (commentRows ?? [])
      .map((comment) => comment.author_member_id)
      .filter((value): value is string => Boolean(value));
    const profileMemberIds = Array.from(new Set([...authorIds, ...commentAuthorIds]));
    const { data: memberProfiles } =
      profileMemberIds.length > 0
        ? await admin
            .from("members")
            .select("id, profiles!left(profile_photo_url)")
            .in("id", profileMemberIds)
        : { data: [] as never[] };

    const profileByMemberId = new Map<string, string | null>(
      (memberProfiles ?? []).map((member) => {
        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
        return [member.id, profile?.profile_photo_url ?? null];
      }),
    );

    return data.map((update) => {
      const author = Array.isArray(update.author_member) ? update.author_member[0] : update.author_member;
      const reactionRows = (reactions ?? []).filter((reaction) => reaction.community_update_id === update.id);
      const reactionCounts: Record<ReactionKind, number> = { heart: 0, like: 0, pray: 0 };
      reactionRows.forEach((reaction) => {
        const kind = (reaction.reaction_kind ?? "heart") as ReactionKind;
        reactionCounts[kind] += 1;
      });
      const imageUrls = (imageRows ?? [])
        .filter((image) => image.community_update_id === update.id)
        .map((image) => image.image_url);
      const normalizedImageUrls = imageUrls.length > 0 ? imageUrls : update.image_url ? [update.image_url] : [];
      const selectedReaction =
        ((memberId &&
          reactionRows.find((reaction) => reaction.member_id === memberId)?.reaction_kind) as ReactionKind | undefined) ?? null;
      const comments = (commentRows ?? [])
        .filter((comment) => comment.community_update_id === update.id)
        .map((comment) => {
          const author = Array.isArray(comment.author_member) ? comment.author_member[0] : comment.author_member;
          const reactionRows = (commentReactions ?? []).filter((reaction) => reaction.community_update_comment_id === comment.id);
          const reactionCounts: Record<CommentReactionKind, number> = { heart: 0, like: 0 };
          reactionRows.forEach((reaction) => {
            const kind = (reaction.reaction_kind ?? "heart") as CommentReactionKind;
            reactionCounts[kind] += 1;
          });
          return {
            id: comment.id,
            authorName: author?.display_name ?? author?.full_name ?? "Church Member",
            authorPhotoUrl: comment.author_member_id ? (profileByMemberId.get(comment.author_member_id) ?? null) : null,
            message: comment.message,
            createdAtLabel: formatDate(comment.created_at),
            reactionCounts,
            selectedReaction: ((memberId && reactionRows.find((reaction) => reaction.member_id === memberId)?.reaction_kind) as CommentReactionKind | undefined) ?? null,
            isOwner: Boolean(memberId && comment.author_member_id === memberId),
          };
        });

      return {
        id: update.id,
        legacyTitle: update.title ?? null,
        summary: update.summary ?? "",
        body: update.body ?? null,
        dateLabel: formatDate(update.activity_date ?? update.published_at ?? new Date().toISOString()),
        imageUrl: normalizedImageUrls[0] ?? null,
        imageUrls: normalizedImageUrls,
        reactionCounts,
        selectedReaction,
        authorName: author?.display_name ?? author?.full_name ?? "Church Member",
        authorPhotoUrl: update.author_member_id ? (profileByMemberId.get(update.author_member_id) ?? null) : null,
        comments,
        commentCount: comments.length,
        isOwner: Boolean(memberId && update.author_member_id === memberId),
        status: update.status,
      } satisfies CommunityUpdateFeedItem;
    }).sort((left, right) => {
      const leftDate = new Date(left.dateLabel).getTime();
      const rightDate = new Date(right.dateLabel).getTime();

      if (Number.isNaN(leftDate) || Number.isNaN(rightDate)) {
        return 0;
      }

      return rightDate - leftDate;
    });
  } catch {
    return getFallbackUpdates();
  }
}
