import { NextResponse } from "next/server";
import { fetchPassageVerses } from "@/lib/bible";

function getSafeParam(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const book = getSafeParam(searchParams.get("book"));
  const chapter = getSafeParam(searchParams.get("chapter"));

  if (!book || !chapter) {
    return NextResponse.json({ error: "Missing book or chapter." }, { status: 400 });
  }

  try {
    const reference = `${book} ${chapter}`;
    const verses = await fetchPassageVerses(reference);

    if (!verses) {
      return NextResponse.json({ error: "Unable to load verses." }, { status: 502 });
    }

    return NextResponse.json({
      verseCount: verses.length,
    });
  } catch {
    return NextResponse.json({ error: "Unable to load verses." }, { status: 500 });
  }
}
