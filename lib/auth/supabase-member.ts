import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { canSelfApproveByRole } from "@/lib/auth/authorization";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { hasPublicSupabaseEnvironment } from "@/lib/runtime";

type AuthenticatedMemberRecord = {
  id: string;
  church_id: string;
  full_name: string;
  display_name?: string | null;
  status: "invited" | "active" | "inactive" | string;
};

export type AuthenticatedMemberSession = {
  user: User;
  member: AuthenticatedMemberRecord;
};

function getPreferredName(user: User) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;

  return metadataName?.trim() || user.email?.split("@")[0] || "Member";
}

async function getSupabaseUser() {
  if (!hasPublicSupabaseEnvironment()) {
    return null;
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

async function resolveDefaultChurchId(admin: ReturnType<typeof createAdminClient>) {
  const preferredSlug = process.env.NEXT_PUBLIC_DEFAULT_CHURCH_SLUG ?? process.env.DEFAULT_CHURCH_SLUG;

  if (preferredSlug) {
    const { data } = await admin.from("churches").select("id").eq("slug", preferredSlug).maybeSingle();

    if (data?.id) {
      return data.id;
    }
  }

  const { data } = await admin.from("churches").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
  return data?.id ?? null;
}

async function findOrCreateMemberForUser(user: User): Promise<AuthenticatedMemberRecord | null> {
  if (!hasAdminEnvironment()) {
    return {
      id: `auth-${user.id}`,
      church_id: "demo-church",
      full_name: getPreferredName(user),
      display_name: getPreferredName(user),
      status: "active",
    };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("members")
    .select("id, church_id, full_name, display_name, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { data: roleRows } = await admin
      .from("member_roles")
      .select("roles!inner(name)")
      .eq("member_id", existing.id);

    const roleNames = (roleRows ?? [])
      .map((item) => {
        const roleEntry = (item as { roles?: { name?: string } | Array<{ name?: string }> }).roles;
        return Array.isArray(roleEntry) ? roleEntry[0]?.name : roleEntry?.name;
      })
      .filter((value): value is string => Boolean(value));

    if (existing.status !== "active" && canSelfApproveByRole(roleNames)) {
      const { data: promoted } = await admin
        .from("members")
        .update({ status: "active" })
        .eq("id", existing.id)
        .select("id, church_id, full_name, display_name, status")
        .single();

      return promoted ?? { ...existing, status: "active" };
    }

    return existing;
  }

  const churchId = await resolveDefaultChurchId(admin);

  if (!churchId) {
    return null;
  }

  const preferredName = getPreferredName(user);
  const { data: inserted, error } = await admin
    .from("members")
    .insert({
      church_id: churchId,
      auth_user_id: user.id,
      full_name: preferredName,
      display_name: preferredName,
      email: user.email ?? null,
      language_preference: "en",
      status: "invited",
    })
    .select("id, church_id, full_name, display_name, status")
    .single();

  if (error || !inserted) {
    return null;
  }

  return inserted;
}

export async function getAuthenticatedMemberSession(): Promise<AuthenticatedMemberSession | null> {
  const user = await getSupabaseUser();

  if (!user) {
    return null;
  }

  const member = await findOrCreateMemberForUser(user);

  if (!member) {
    return null;
  }

  return {
    user,
    member,
  };
}

export async function requireAuthenticatedMemberSession() {
  const session = await getAuthenticatedMemberSession();

  if (!session) {
    redirect("/prayer");
  }

  return session;
}
