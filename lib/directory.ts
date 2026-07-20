import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberRoles } from "@/lib/auth/authorization";
import { hasAdminEnvironment } from "@/lib/supabase/admin";

export type DirectoryContactVisibility = "public" | "leaders_only" | "hide_contact";

export type DirectoryMember = {
  id: string;
  photoUrl: string | null;
  displayName: string;
  ministry: string | null;
  smallGroup: string | null;
  role: string;
  phone: string | null;
  email: string | null;
  phoneVisibility: DirectoryContactVisibility;
  emailVisibility: DirectoryContactVisibility;
};

export async function getDirectoryContext(memberId: string, churchId: string) {
  if (!hasAdminEnvironment()) {
    return [
      {
        id: "demo-member-1",
        photoUrl: null,
        displayName: "Daniel Kim",
        ministry: "Sunday Worship",
        smallGroup: "Downtown",
        role: "Admin",
        phone: "(201) 555-0101",
        email: "daniel@example.com",
        phoneVisibility: "public",
        emailVisibility: "public",
      },
      {
        id: "demo-member-2",
        photoUrl: null,
        displayName: "Grace Lee",
        ministry: "Prayer",
        smallGroup: "Queens",
        role: "Leader",
        phone: "(201) 555-0142",
        email: "grace@example.com",
        phoneVisibility: "leaders_only",
        emailVisibility: "leaders_only",
      },
      {
        id: "demo-member-3",
        photoUrl: null,
        displayName: "Esther Park",
        ministry: "Hospitality",
        smallGroup: "Fort Lee",
        role: "Member",
        phone: null,
        email: null,
        phoneVisibility: "hide_contact",
        emailVisibility: "hide_contact",
      },
    ] satisfies DirectoryMember[];
  }

  const roles = await getMemberRoles(memberId);
  const isLeader = roles.includes("admin") || roles.includes("leader");
  const admin = createAdminClient();

  try {
    const { data, error } = await admin
      .from("members")
      .select(
        `
          id,
          display_name,
          full_name,
          phone,
          email,
          small_group,
          profiles!left(profile_photo_url),
          ministries!left(name),
          member_roles!left(
            roles!inner(name)
          ),
          directory_visibility_settings!left(
            phone_visibility,
            email_visibility
          )
        `,
      )
      .eq("church_id", churchId)
      .eq("status", "active")
      .order("display_name", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((member) => {
      const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
      const ministry = Array.isArray(member.ministries) ? member.ministries[0] : member.ministries;
      const visibility = Array.isArray(member.directory_visibility_settings)
        ? member.directory_visibility_settings[0]
        : member.directory_visibility_settings;
      const memberRoles = Array.isArray(member.member_roles) ? member.member_roles : member.member_roles ? [member.member_roles] : [];
      const normalizedRoles = memberRoles
        .map((entry) => {
          const roleEntry = (entry as { roles?: { name?: string } | Array<{ name?: string }> }).roles;
          return Array.isArray(roleEntry) ? roleEntry[0]?.name : roleEntry?.name;
        })
        .filter((value): value is string => Boolean(value));

      const role = normalizedRoles.includes("admin")
        ? "Admin"
        : normalizedRoles.includes("leader")
          ? "Leader"
          : "Member";

      const phoneVisibility = (visibility?.phone_visibility ?? "hide_contact") as DirectoryContactVisibility;
      const emailVisibility = (visibility?.email_visibility ?? "hide_contact") as DirectoryContactVisibility;

      return {
        id: member.id,
        photoUrl: profile?.profile_photo_url ?? null,
        displayName: member.display_name ?? member.full_name,
        ministry: ministry?.name ?? null,
        smallGroup: member.small_group ?? null,
        role,
        phone: canShowContact(phoneVisibility, isLeader) ? member.phone ?? null : null,
        email: canShowContact(emailVisibility, isLeader) ? member.email ?? null : null,
        phoneVisibility,
        emailVisibility,
      } satisfies DirectoryMember;
    });
  } catch {
    return [];
  }
}

function canShowContact(visibility: DirectoryContactVisibility, isLeader: boolean) {
  if (visibility === "public") return true;
  if (visibility === "leaders_only") return isLeader;
  return false;
}
