import { NextResponse } from "next/server";
import { findActiveInvitationByCode } from "@/lib/auth/invitations";

export async function POST(request: Request) {
  try {
    const { code } = (await request.json()) as { code?: string };

    if (!code || code.trim().length < 4) {
      return NextResponse.json({ error: "Please check the invitation code and try again." }, { status: 400 });
    }

    const invitation = await findActiveInvitationByCode(code);

    if (!invitation) {
      return NextResponse.json({ error: "We could not find a valid invitation code." }, { status: 404 });
    }

    return NextResponse.json({
      code: invitation.code,
      churchName: invitation.churchName ?? "KOINONIA",
      issuedForName: invitation.issued_for_name ?? null,
    });
  } catch {
    return NextResponse.json({ error: "There was a problem verifying the invitation." }, { status: 500 });
  }
}
