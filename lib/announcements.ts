import "server-only";
import { createAdminClient, hasAdminEnvironment } from "@/lib/supabase/admin";

export type AnnouncementListItem = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
};

export type AnnouncementCarouselItem = {
  item: AnnouncementListItem | null;
  hasPrevious: boolean;
  hasNext: boolean;
  index: number;
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

export async function getAnnouncementCarouselItem(
  churchId?: string | null,
  index = 0,
): Promise<AnnouncementCarouselItem> {
  if (!hasAdminEnvironment() || !churchId) {
    return {
      item: null,
      hasPrevious: false,
      hasNext: false,
      index: 0,
    };
  }

  const safeIndex = Math.max(0, Number.isFinite(index) ? Math.trunc(index) : 0);

  try {
    const admin = createAdminClient();
    const { data, error, count } = await admin
      .from("announcements")
      .select("id, title, body, image_url, published_at, created_at", { count: "exact" })
      .eq("church_id", churchId)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(safeIndex, safeIndex);

    const total = count ?? 0;
    const item = !error && data && data.length > 0
      ? {
          id: data[0].id,
          title: data[0].title,
          body: data[0].body,
          imageUrl: data[0].image_url ?? null,
        }
      : null;

    return {
      item,
      hasPrevious: safeIndex > 0 && total > 0,
      hasNext: total > safeIndex + 1,
      index: safeIndex,
    };
  } catch {
    return {
      item: null,
      hasPrevious: false,
      hasNext: false,
      index: safeIndex,
    };
  }
}
