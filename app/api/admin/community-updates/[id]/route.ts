import { NextResponse } from "next/server";
import { requireAdminOrLeaderSession } from "@/lib/auth/authorization";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

function normalizeText(value: string) {
  return value.trim().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

const CONTENT_LIMIT = 150;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminOrLeaderSession();
    const { id } = await context.params;
    const body = (await request.json()) as {
      summary?: string;
      body?: string;
      imageUrl?: string;
      activityDate?: string;
      status?: "pending" | "approved" | "rejected" | "archived";
    };

    const summary = normalizeText(body.summary ?? "");
    const content = normalizeText(body.body ?? body.summary ?? "");
    const nextStatus = body.status ?? "pending";

    if (summary.length > CONTENT_LIMIT || content.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the content under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        communityUpdate: {
          id,
          summary,
          body: content,
          imageUrl: body.imageUrl ?? null,
          status: nextStatus,
        },
      });
    }

    const admin = createAdminClient();
    const payload: Record<string, string | null> = {
      title: null,
      summary,
      body: content,
      image_url: (body.imageUrl ?? "").trim() || null,
      activity_date: (body.activityDate ?? "").trim() || null,
      status: nextStatus,
    };

    if (nextStatus === "approved") {
      payload.approved_at = new Date().toISOString();
      payload.approved_by_member_id = session.member.id;
      payload.published_at = new Date().toISOString();
      payload.archived_at = null;
    }

    if (nextStatus === "rejected") {
      payload.published_at = null;
      payload.archived_at = null;
    }

    if (nextStatus === "archived") {
      payload.archived_at = new Date().toISOString();
    }

    const { data, error } = await admin
      .from("community_updates")
      .update(payload)
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .select("id, title, summary, body, image_url, activity_date, status, published_at, author_member:members!community_updates_author_member_id_fkey(display_name, full_name)")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to update community update." }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "community_updates",
      entity_id: id,
      action: nextStatus === "approved" ? "approve" : nextStatus === "rejected" ? "reject" : nextStatus === "archived" ? "archive" : "update",
      metadata: {
        status: nextStatus,
      },
    });

    return NextResponse.json({
      success: true,
      communityUpdate: {
        id: data.id,
        summary: data.summary ?? "",
        body: data.body ?? "",
        imageUrl: data.image_url ?? null,
        activityDate: data.activity_date,
        status: data.status,
        authorName: (Array.isArray(data.author_member) ? data.author_member[0] : data.author_member)?.display_name ??
          (Array.isArray(data.author_member) ? data.author_member[0] : data.author_member)?.full_name ??
          "Church Member",
        publishedAtLabel: data.published_at
          ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(data.published_at))
          : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to update community update." }, { status: 500 });
  }
}
