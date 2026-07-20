import { NextResponse } from "next/server";
import { requireAdminOrLeaderSession } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizePrayerText(text: string) {
  return text.trim().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

const CONTENT_LIMIT = 150;

function formatPrayerItem(item: {
  id: string;
  title: string | null;
  request_text: string;
  status: "pending" | "approved" | "rejected" | "archived";
  visibility: "public" | "small_group" | "leaders_only";
  created_at: string;
  published_at: string | null;
  requester_member?: { full_name: string | null } | { full_name: string | null }[] | null;
}) {
  const requester = Array.isArray(item.requester_member) ? item.requester_member[0] : item.requester_member;

  return {
    id: item.id,
    requestText: item.request_text,
    status: item.status,
    visibility: item.visibility,
    requesterName: requester?.full_name ?? "Unknown member",
    createdAtLabel: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(item.created_at)),
    publishedAtLabel: item.published_at
      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(item.published_at))
      : null,
  };
}

export function generateStaticParams() {
  return [];
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminOrLeaderSession();
    const { id } = await context.params;
    const body = (await request.json()) as {
      requestText?: string;
      visibility?: "public" | "small_group" | "leaders_only";
      status?: "pending" | "approved" | "rejected" | "archived";
    };

    const requestText = normalizePrayerText(body.requestText ?? "");
    const status = body.status ?? "pending";
    const visibility = body.visibility ?? "public";

    if (!requestText) {
      return NextResponse.json({ error: "Prayer text is required." }, { status: 400 });
    }

    if (requestText.length > CONTENT_LIMIT) {
      return NextResponse.json({ error: `Please keep the content under ${CONTENT_LIMIT} characters.` }, { status: 400 });
    }

    const admin = createAdminClient();
    const updatePayload: Record<string, string | null> = {
      title: null,
      request_text: requestText,
      visibility,
      status,
    };

    if (status === "approved") {
      updatePayload.approved_at = new Date().toISOString();
      updatePayload.approved_by_member_id = session.member.id;
      updatePayload.published_at = new Date().toISOString();
      updatePayload.archived_at = null;
    }

    if (status === "rejected") {
      updatePayload.published_at = null;
      updatePayload.archived_at = null;
    }

    if (status === "archived") {
      updatePayload.archived_at = new Date().toISOString();
    }

    const { data, error } = await admin
      .from("prayer_requests")
      .update(updatePayload)
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .select("id, title, request_text, status, visibility, created_at, published_at, requester_member:members!prayer_requests_requester_member_id_fkey(full_name)")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to update prayer request." }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "prayer_requests",
      entity_id: id,
      action: status === "approved" ? "approve" : status === "rejected" ? "reject" : status === "archived" ? "archive" : "update",
      metadata: {
        status,
        visibility,
      },
    });

    return NextResponse.json({
      prayerRequest: formatPrayerItem(data),
    });
  } catch {
    return NextResponse.json({ error: "Unable to update prayer request." }, { status: 500 });
  }
}
