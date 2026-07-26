import { NextResponse } from "next/server";

type BibleApiResponse = {
  verses?: Array<{ verse: number; text: string }>;
};

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
    const response = await fetch(
      `https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv&single_chapter_book_matching=indifferent`,
      { next: { revalidate: 86400 } },
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to load verses." }, { status: 502 });
    }

    const payload = (await response.json()) as BibleApiResponse;
    return NextResponse.json({
      verseCount: payload.verses?.length ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Unable to load verses." }, { status: 500 });
  }
}
