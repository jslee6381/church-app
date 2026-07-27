import { NextResponse } from "next/server";
import { fetchPassageVerses } from "@/lib/bible";

function getSafeParam(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = getSafeParam(searchParams.get("reference"));

  if (!reference) {
    return NextResponse.json({ error: "Missing passage reference." }, { status: 400 });
  }

  try {
    const verses = await fetchPassageVerses(reference);

    if (!verses) {
      return NextResponse.json({ error: "Unable to load passage." }, { status: 502 });
    }

    return NextResponse.json({
      verses,
    });
  } catch {
    return NextResponse.json({ error: "Unable to load passage." }, { status: 500 });
  }
}
