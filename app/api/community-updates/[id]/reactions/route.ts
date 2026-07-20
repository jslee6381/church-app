import { NextResponse } from "next/server";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import type { ReactionKind } from "@/lib/community-updates";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

function emptyReactionCounts() {
  return {
    heart: 0,
    like: 0,
    pray: 0,
  } satisfies Record<ReactionKind, number>;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session || session.member.status !== "active") {
      return NextResponse.json({ error: "Only approved members can react." }, { status: 403 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        reactionCounts: emptyReactionCounts(),
        reacted: false,
        selectedReaction: null,
      });
    }

    const { id } = await context.params;
    const body = (await request.json()) as { reactionKind?: ReactionKind };
    const reactionKind = body.reactionKind ?? "heart";
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("community_update_reactions")
      .select("community_update_id, reaction_kind")
      .eq("community_update_id", id)
      .eq("member_id", session.member.id)
      .maybeSingle();

    if (!existing) {
      await admin.from("community_update_reactions").insert({
        community_update_id: id,
        member_id: session.member.id,
        reaction_kind: reactionKind,
      });
    } else if (existing.reaction_kind === reactionKind) {
      await admin
        .from("community_update_reactions")
        .delete()
        .eq("community_update_id", id)
        .eq("member_id", session.member.id);
    } else {
      await admin
        .from("community_update_reactions")
        .update({ reaction_kind: reactionKind })
        .eq("community_update_id", id)
        .eq("member_id", session.member.id);
    }

    const { data: reactions } = await admin
      .from("community_update_reactions")
      .select("reaction_kind")
      .eq("community_update_id", id);

    const reactionCounts = emptyReactionCounts();
    (reactions ?? []).forEach((reaction) => {
      const kind = (reaction.reaction_kind ?? "heart") as ReactionKind;
      reactionCounts[kind] += 1;
    });

    const reacted = !existing || existing.reaction_kind !== reactionKind;

    return NextResponse.json({
      success: true,
      reactionCounts,
      reacted,
      selectedReaction: reacted ? reactionKind : null,
    });
  } catch {
    return NextResponse.json({ error: "Unable to update reaction." }, { status: 500 });
  }
}
