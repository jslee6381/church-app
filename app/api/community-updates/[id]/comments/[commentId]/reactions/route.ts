import { NextResponse } from "next/server";
import type { CommentReactionKind } from "@/lib/community-updates";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

function emptyReactionCounts() {
  return { heart: 0, like: 0 } satisfies Record<CommentReactionKind, number>;
}

export async function POST(request: Request, context: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();
    if (!session || session.member.status !== "active") {
      return NextResponse.json({ error: "Only approved members can react." }, { status: 403 });
    }

    const body = (await request.json()) as { reactionKind?: CommentReactionKind };
    const reactionKind = body.reactionKind ?? "heart";

    if (!hasAdminEnvironment()) {
      return NextResponse.json({ success: true, reactionCounts: emptyReactionCounts(), reacted: false, selectedReaction: null });
    }

    const { commentId } = await context.params;
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("community_update_comment_reactions")
      .select("community_update_comment_id, reaction_kind")
      .eq("community_update_comment_id", commentId)
      .eq("member_id", session.member.id)
      .maybeSingle();

    if (!existing) {
      await admin.from("community_update_comment_reactions").insert({
        community_update_comment_id: commentId,
        member_id: session.member.id,
        reaction_kind: reactionKind,
      });
    } else if (existing.reaction_kind === reactionKind) {
      await admin
        .from("community_update_comment_reactions")
        .delete()
        .eq("community_update_comment_id", commentId)
        .eq("member_id", session.member.id);
    } else {
      await admin
        .from("community_update_comment_reactions")
        .update({ reaction_kind: reactionKind })
        .eq("community_update_comment_id", commentId)
        .eq("member_id", session.member.id);
    }

    const { data: reactions } = await admin
      .from("community_update_comment_reactions")
      .select("reaction_kind")
      .eq("community_update_comment_id", commentId);

    const reactionCounts = emptyReactionCounts();
    (reactions ?? []).forEach((reaction) => {
      const kind = (reaction.reaction_kind ?? "heart") as CommentReactionKind;
      reactionCounts[kind] += 1;
    });

    const reacted = !existing || existing.reaction_kind !== reactionKind;
    return NextResponse.json({ success: true, reactionCounts, reacted, selectedReaction: reacted ? reactionKind : null });
  } catch {
    return NextResponse.json({ error: "Unable to update reaction." }, { status: 500 });
  }
}
