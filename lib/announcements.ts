import "server-only";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export type AnnouncementListItem = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
};

export async function getAnnouncements(churchId?: string | null): Promise<AnnouncementListItem[]> {
  if (!hasAdminEnvironment() || !churchId) {
    return [];
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("announcements")
      .select("id, title, body, image_url, published_at, created_at")
      .eq("church_id", churchId)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      imageUrl: item.image_url ?? null,
    }));
  } catch {
    return [];
  }
}
