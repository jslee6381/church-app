import { NextResponse } from "next/server";

type BibleApiVerse = {
  verse: number;
  text: string;
};

type BibleApiResponse = {
  verses?: BibleApiVerse[];
};

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
    const response = await fetch(
      `https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv&single_chapter_book_matching=indifferent`,
      { next: { revalidate: 86400 } },
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to load passage." }, { status: 502 });
    }

    const payload = (await response.json()) as BibleApiResponse;
    return NextResponse.json({
      verses: payload.verses ?? [],
    });
  } catch {
    return NextResponse.json({ error: "Unable to load passage." }, { status: 500 });
  }
}
