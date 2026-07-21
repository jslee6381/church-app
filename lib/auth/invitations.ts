import "server-only";
import { DEV_INVITATION_CODE } from "@/lib/auth/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashOpaqueValue } from "@/lib/auth/crypto";

export function normalizeInvitationCode(code: string) {
  return code.replace(/\s+/g, "").trim().toUpperCase();
}

export async function findActiveInvitationByCode(rawCode: string) {
  const code = normalizeInvitationCode(rawCode);

  if (!code) {
    return null;
  }

  if (process.env.NODE_ENV !== "production" && code === DEV_INVITATION_CODE) {
    return {
      id: "dev-invitation",
      church_id: "demo-church",
      issued_for_name: "Demo Member",
      usage_count: 0,
      max_usage: 999,
      status: "active",
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      code,
      churchName: "KOINONIA",
      isDevelopmentFallback: true,
    };
  }

  const admin = createAdminClient();
  const hashedToken = hashOpaqueValue(code);
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("invitation_tokens")
    .select(
      "id, church_id, issued_for_name, usage_count, max_usage, status, expires_at, churches!invitation_tokens_church_id_fkey(name)",
    )
    .eq("hashed_token", hashedToken)
    .eq("status", "active")
    .gt("expires_at", now)
    .single();

  if (error || !data) {
    return null;
  }

  if (data.usage_count >= data.max_usage) {
    return null;
  }

  const churchEntry = data.churches as { name?: string } | Array<{ name?: string }> | null;

  return {
    ...data,
    code,
    churchName: Array.isArray(churchEntry) ? churchEntry[0]?.name : churchEntry?.name,
  };
}
