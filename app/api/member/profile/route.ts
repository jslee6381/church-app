import { NextResponse } from "next/server";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  try {
    const session = await getAuthenticatedMemberSession();

    if (!session) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const { displayName } = (await request.json()) as { displayName?: string };
    const normalizedDisplayName = displayName?.trim() ?? "";

    if (normalizedDisplayName.length < 2) {
      return NextResponse.json({ error: "Please enter at least two characters." }, { status: 400 });
    }

    if (!hasAdminEnvironment()) {
      return NextResponse.json({
        success: true,
        member: {
          ...session.member,
          display_name: normalizedDisplayName,
        },
      });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("members")
      .update({
        display_name: normalizedDisplayName,
        full_name: session.member.full_name || normalizedDisplayName,
      })
      .eq("id", session.member.id)
      .select("id, church_id, full_name, display_name, status")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to update display name." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      member: data,
    });
  } catch {
    return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}
