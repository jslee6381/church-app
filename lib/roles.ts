import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AppRole = "admin" | "leader" | "member";

const ROLE_NAMES: AppRole[] = ["admin", "leader", "member"];

export function normalizeRoleName(value: string | null | undefined): AppRole | null {
  if (value === "admin" || value === "leader" || value === "member") {
    return value;
  }

  return null;
}

export function getPrimaryRole(roles: string[]): AppRole {
  if (roles.includes("admin")) {
    return "admin";
  }

  if (roles.includes("leader")) {
    return "leader";
  }

  return "member";
}

export async function ensureChurchRoles(churchId: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("roles").select("id, name").eq("church_id", churchId);
  const present = new Set((existing ?? []).map((role) => role.name));
  const missing = ROLE_NAMES.filter((name) => !present.has(name));

  if (missing.length > 0) {
    await admin.from("roles").insert(
      missing.map((name) => ({
        church_id: churchId,
        name,
        description: `${name[0].toUpperCase()}${name.slice(1)} access`,
      })),
    );
  }

  const { data: roles } = await admin.from("roles").select("id, name").eq("church_id", churchId);

  return new Map((roles ?? []).map((role) => [role.name as AppRole, role.id]));
}
