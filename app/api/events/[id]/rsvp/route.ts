import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

type EventRsvpStatus = "going" | "maybe" | "not_going";

export function generateStaticParams() {
  return [];
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 401 });
    }

    const { id } = await context.params;
    const { status } = (await request.json()) as { status?: EventRsvpStatus };

    if (!status || !["going", "maybe", "not_going"].includes(status)) {
      return NextResponse.json({ error: "A valid RSVP status is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id, church_id")
      .eq("id", id)
      .eq("church_id", session.member.church_id)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const { error } = await admin.from("event_rsvps").upsert(
      {
        event_id: id,
        member_id: session.member.id,
        status,
        attendee_count: 1,
      },
      {
        onConflict: "event_id,member_id",
      },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "event_rsvps",
      entity_id: id,
      action: "update",
      metadata: {
        status,
      },
    });

    return NextResponse.json({ success: true, status });
  } catch {
    return NextResponse.json({ error: "Unable to save RSVP." }, { status: 500 });
  }
}
