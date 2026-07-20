import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { MEMBER_DEMO_SESSION_COOKIE, MEMBER_SESSION_COOKIE, MEMBER_SESSION_TTL_DAYS } from "@/lib/auth/constants";
import { generateOpaqueToken, hashOpaqueValue, signValue } from "@/lib/auth/crypto";
import { isDemoMode } from "@/lib/runtime";
import { createAdminClient } from "@/lib/supabase/admin";

type SessionMember = {
  id: string;
  church_id: string;
  full_name: string;
  status: string;
};

export type MemberSession = {
  sessionId: string;
  member: SessionMember;
  expiresAt: string;
};

const SESSION_TTL_MS = MEMBER_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const DEMO_SESSION_ID = "demo-session";
const DEMO_CHURCH_ID = "demo-church";

function getSessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function encodeDemoSession(payload: { member: SessionMember; expiresAt: string }) {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json).toString("base64url");
  return `${encoded}.${signValue(encoded)}`;
}

function decodeDemoSession(value: string): { member: SessionMember; expiresAt: string } | null {
  const [encoded, signature] = value.split(".");

  if (!encoded || !signature) {
    return null;
  }

  if (signValue(encoded) !== signature) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      member: SessionMember;
      expiresAt: string;
    };

    if (!parsed?.member?.id || !parsed.expiresAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function createMemberSession(member: { id: string; church_id: string }) {
  const admin = createAdminClient();
  const rawToken = generateOpaqueToken();
  const tokenHash = hashOpaqueValue(rawToken);
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const { data, error } = await admin
    .from("member_sessions")
    .insert({
      church_id: member.church_id,
      member_id: member.id,
      session_token_hash: tokenHash,
      user_agent: requestHeaders.get("user-agent"),
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create member session");
  }

  cookieStore.set(MEMBER_SESSION_COOKIE, rawToken, getSessionCookieOptions(expiresAt));

  return {
    sessionId: data.id,
    rawToken,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function createDemoMemberSession(displayName: string) {
  const cookieStore = await cookies();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const payload = {
    member: {
      id: `demo-member-${displayName.toLowerCase().replace(/\s+/g, "-")}`,
      church_id: DEMO_CHURCH_ID,
      full_name: displayName,
      status: "active",
    } satisfies SessionMember,
    expiresAt: expiresAt.toISOString(),
  };

  cookieStore.set(MEMBER_DEMO_SESSION_COOKIE, encodeDemoSession(payload), getSessionCookieOptions(expiresAt));

  return {
    sessionId: DEMO_SESSION_ID,
    member: payload.member,
    expiresAt: payload.expiresAt,
  } satisfies MemberSession;
}

function getDefaultDemoSession(): MemberSession {
  return {
    sessionId: DEMO_SESSION_ID,
    member: {
      id: "demo-member",
      church_id: DEMO_CHURCH_ID,
      full_name: "Demo Member",
      status: "active",
    },
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
}

export async function clearMemberSession() {
  if (isDemoMode()) {
    const cookieStore = await cookies();
    cookieStore.delete(MEMBER_SESSION_COOKIE);
    cookieStore.delete(MEMBER_DEMO_SESSION_COOKIE);
    return;
  }

  const cookieStore = await cookies();
  const rawToken = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;

  if (rawToken) {
    const admin = createAdminClient();
    const tokenHash = hashOpaqueValue(rawToken);

    await admin
      .from("member_sessions")
      .update({
        revoked_at: new Date().toISOString(),
      })
      .eq("session_token_hash", tokenHash)
      .is("revoked_at", null);
  }

  cookieStore.delete(MEMBER_SESSION_COOKIE);
  cookieStore.delete(MEMBER_DEMO_SESSION_COOKIE);
}

export async function getMemberSession(): Promise<MemberSession | null> {
  if (isDemoMode()) {
    return getDefaultDemoSession();
  }

  const cookieStore = await cookies();
  const rawToken = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;

  if (!rawToken) {
    const demoToken = cookieStore.get(MEMBER_DEMO_SESSION_COOKIE)?.value;

    if (!demoToken || !isDevelopment()) {
      return null;
    }

    const demoSession = decodeDemoSession(demoToken);

    if (!demoSession || new Date(demoSession.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return {
      sessionId: DEMO_SESSION_ID,
      member: demoSession.member,
      expiresAt: demoSession.expiresAt,
    };
  }

  const admin = createAdminClient();
  const tokenHash = hashOpaqueValue(rawToken);
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("member_sessions")
    .select("id, expires_at, member:members!member_sessions_member_id_fkey(id, church_id, full_name, status)")
    .eq("session_token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .single();

  if (error || !data || !data.member) {
    return null;
  }

  await admin
    .from("member_sessions")
    .update({
      last_seen_at: now,
    })
    .eq("id", data.id);

  return {
    sessionId: data.id,
    member: Array.isArray(data.member) ? data.member[0] : data.member,
    expiresAt: data.expires_at,
  };
}

export async function requireMemberSession() {
  const session = await getMemberSession();

  if (!session) {
    redirect("/invite");
  }

  return session;
}
