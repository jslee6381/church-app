import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { ensureChurchRoles } from "@/lib/roles";
import { isProtectedAdminEmail } from "@/lib/protected-admin";
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
  const isProtectedAdmin = isProtectedAdminEmail(user.email);
  const { data: existing } = await admin
    .from("members")
    .select("id, church_id, full_name, display_name, status, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existing) {
    if (isProtectedAdmin) {
      const roleMap = await ensureChurchRoles(existing.church_id);
      const adminRoleId = roleMap.get("admin");

      if (adminRoleId) {
        await admin.from("member_roles").delete().eq("member_id", existing.id);
        await admin.from("member_roles").insert({
          member_id: existing.id,
          role_id: adminRoleId,
        });
      }

      const { data: promoted } = await admin
        .from("members")
        .update({
          status: "active",
          email: user.email ?? existing.email ?? null,
        })
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
      status: isProtectedAdmin ? "active" : "invited",
    })
    .select("id, church_id, full_name, display_name, status")
    .single();

  if (error || !inserted) {
    return null;
  }

  if (isProtectedAdmin) {
    const roleMap = await ensureChurchRoles(churchId);
    const adminRoleId = roleMap.get("admin");

    if (adminRoleId) {
      await admin.from("member_roles").delete().eq("member_id", inserted.id);
      await admin.from("member_roles").insert({
        member_id: inserted.id,
        role_id: adminRoleId,
      });
    }
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
