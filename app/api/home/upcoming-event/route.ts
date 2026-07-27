import { NextResponse } from "next/server";
import { getAuthenticatedMemberSession } from "@/lib/auth/supabase-member";
import { getDefaultChurchId } from "@/lib/church-context";
import { getUpcomingEventCarouselItem } from "@/lib/events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawIndex = Number.parseInt(searchParams.get("index") ?? "0", 10);
  const index = Number.isFinite(rawIndex) ? Math.max(0, rawIndex) : 0;

  const authSession = await getAuthenticatedMemberSession();
  const churchId = authSession?.member.church_id ?? (await getDefaultChurchId());
  const payload = await getUpcomingEventCarouselItem(churchId, index);

  return NextResponse.json(payload);
}
