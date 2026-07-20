import "server-only";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export async function getDefaultChurchId() {
  if (!hasAdminEnvironment()) {
    return null;
  }

  const admin = createAdminClient();
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
