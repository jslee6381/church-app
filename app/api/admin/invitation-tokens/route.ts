import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireAdminOrLeaderSession } from "@/lib/auth/authorization";
import { generateOpaqueToken, hashOpaqueValue } from "@/lib/auth/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function buildInvitationCode() {
  return `GRACE-${generateOpaqueToken(4).slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminOrLeaderSession();
    const admin = createAdminClient();
    const body = (await request.json()) as {
      issuedForName?: string;
      maxUsage?: number;
      expiresInDays?: number;
    };

    const issuedForName = body.issuedForName?.trim() || null;
    const maxUsage = Math.max(1, Math.min(100, Number(body.maxUsage) || 1));
    const expiresInDays = Math.max(1, Math.min(90, Number(body.expiresInDays) || 14));
    const code = buildInvitationCode();
    const hashedToken = hashOpaqueValue(code);
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl.replace(/\/$/, "")}/invite?code=${encodeURIComponent(code)}`;
    const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: "#173f39",
        light: "#fffdf9",
      },
    });

    const { error } = await admin.from("invitation_tokens").insert({
      church_id: session.member.church_id,
      hashed_token: hashedToken,
      token_hint: code.slice(-4),
      qr_payload: inviteUrl,
      issued_for_name: issuedForName,
      issued_by_member_id: session.member.id,
      expires_at: expiresAt.toISOString(),
      max_usage: maxUsage,
      usage_count: 0,
      status: "active",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      church_id: session.member.church_id,
      actor_member_id: session.member.id,
      entity_type: "invitation_tokens",
      action: "create",
      metadata: {
        issued_for_name: issuedForName,
        max_usage: maxUsage,
        expires_in_days: expiresInDays,
      },
    });

    return NextResponse.json({
      code,
      qrDataUrl,
      inviteUrl,
      maxUsage,
      expiresAtLabel: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(expiresAt),
    });
  } catch {
    return NextResponse.json({ error: "Unable to generate invitation token." }, { status: 500 });
  }
}
