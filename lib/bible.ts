export type BibleBook = {
  book: string;
  testament: "OT" | "NT";
  chapterCount: number;
};

export type BibleVerse = {
  verse: number;
  text: string;
};

const BIBLE_GATEWAY_BASE_URL = "https://www.biblegateway.com/passage/";

export const BIBLE_BOOKS: BibleBook[] = [
  { book: "Genesis", testament: "OT", chapterCount: 50 },
  { book: "Exodus", testament: "OT", chapterCount: 40 },
  { book: "Leviticus", testament: "OT", chapterCount: 27 },
  { book: "Numbers", testament: "OT", chapterCount: 36 },
  { book: "Deuteronomy", testament: "OT", chapterCount: 34 },
  { book: "Joshua", testament: "OT", chapterCount: 24 },
  { book: "Judges", testament: "OT", chapterCount: 21 },
  { book: "Ruth", testament: "OT", chapterCount: 4 },
  { book: "1 Samuel", testament: "OT", chapterCount: 31 },
  { book: "2 Samuel", testament: "OT", chapterCount: 24 },
  { book: "1 Kings", testament: "OT", chapterCount: 22 },
  { book: "2 Kings", testament: "OT", chapterCount: 25 },
  { book: "1 Chronicles", testament: "OT", chapterCount: 29 },
  { book: "2 Chronicles", testament: "OT", chapterCount: 36 },
  { book: "Ezra", testament: "OT", chapterCount: 10 },
  { book: "Nehemiah", testament: "OT", chapterCount: 13 },
  { book: "Esther", testament: "OT", chapterCount: 10 },
  { book: "Job", testament: "OT", chapterCount: 42 },
  { book: "Psalms", testament: "OT", chapterCount: 150 },
  { book: "Proverbs", testament: "OT", chapterCount: 31 },
  { book: "Ecclesiastes", testament: "OT", chapterCount: 12 },
  { book: "Song of Solomon", testament: "OT", chapterCount: 8 },
  { book: "Isaiah", testament: "OT", chapterCount: 66 },
  { book: "Jeremiah", testament: "OT", chapterCount: 52 },
  { book: "Lamentations", testament: "OT", chapterCount: 5 },
  { book: "Ezekiel", testament: "OT", chapterCount: 48 },
  { book: "Daniel", testament: "OT", chapterCount: 12 },
  { book: "Hosea", testament: "OT", chapterCount: 14 },
  { book: "Joel", testament: "OT", chapterCount: 3 },
  { book: "Amos", testament: "OT", chapterCount: 9 },
  { book: "Obadiah", testament: "OT", chapterCount: 1 },
  { book: "Jonah", testament: "OT", chapterCount: 4 },
  { book: "Micah", testament: "OT", chapterCount: 7 },
  { book: "Nahum", testament: "OT", chapterCount: 3 },
  { book: "Habakkuk", testament: "OT", chapterCount: 3 },
  { book: "Zephaniah", testament: "OT", chapterCount: 3 },
  { book: "Haggai", testament: "OT", chapterCount: 2 },
  { book: "Zechariah", testament: "OT", chapterCount: 14 },
  { book: "Malachi", testament: "OT", chapterCount: 4 },
  { book: "Matthew", testament: "NT", chapterCount: 28 },
  { book: "Mark", testament: "NT", chapterCount: 16 },
  { book: "Luke", testament: "NT", chapterCount: 24 },
  { book: "John", testament: "NT", chapterCount: 21 },
  { book: "Acts", testament: "NT", chapterCount: 28 },
  { book: "Romans", testament: "NT", chapterCount: 16 },
  { book: "1 Corinthians", testament: "NT", chapterCount: 16 },
  { book: "2 Corinthians", testament: "NT", chapterCount: 13 },
  { book: "Galatians", testament: "NT", chapterCount: 6 },
  { book: "Ephesians", testament: "NT", chapterCount: 6 },
  { book: "Philippians", testament: "NT", chapterCount: 4 },
  { book: "Colossians", testament: "NT", chapterCount: 4 },
  { book: "1 Thessalonians", testament: "NT", chapterCount: 5 },
  { book: "2 Thessalonians", testament: "NT", chapterCount: 3 },
  { book: "1 Timothy", testament: "NT", chapterCount: 6 },
  { book: "2 Timothy", testament: "NT", chapterCount: 4 },
  { book: "Titus", testament: "NT", chapterCount: 3 },
  { book: "Philemon", testament: "NT", chapterCount: 1 },
  { book: "Hebrews", testament: "NT", chapterCount: 13 },
  { book: "James", testament: "NT", chapterCount: 5 },
  { book: "1 Peter", testament: "NT", chapterCount: 5 },
  { book: "2 Peter", testament: "NT", chapterCount: 3 },
  { book: "1 John", testament: "NT", chapterCount: 5 },
  { book: "2 John", testament: "NT", chapterCount: 1 },
  { book: "3 John", testament: "NT", chapterCount: 1 },
  { book: "Jude", testament: "NT", chapterCount: 1 },
  { book: "Revelation", testament: "NT", chapterCount: 22 },
];

export function getBibleBook(bookName: string) {
  return BIBLE_BOOKS.find((item) => item.book === bookName) ?? null;
}

export function formatPassageRange(
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number,
) {
  if (startChapter === endChapter) {
    if (startVerse === endVerse) {
      return `${book} ${startChapter}:${startVerse}`;
    }

    return `${book} ${startChapter}:${startVerse}-${endVerse}`;
  }

  return `${book} ${startChapter}:${startVerse}-${endChapter}:${endVerse}`;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2019;/gi, "’")
    .replace(/&#x201c;/gi, "“")
    .replace(/&#x201d;/gi, "”")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchBibleGatewayPassageHtml(reference: string) {
  const url = `${BIBLE_GATEWAY_BASE_URL}?search=${encodeURIComponent(reference)}&version=NIV`;
  const response = await fetch(url, {
    next: { revalidate: 86400 },
    headers: {
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.text();
}

function parseBibleGatewayVerses(html: string) {
  const stdTextMatch = html.match(
    /<div class=['"]std-text['"]>([\s\S]*?)<\/div><div class=['"]il-text['"]>/i,
  );

  if (!stdTextMatch) {
    return null;
  }

  const normalized = stdTextMatch[1]
    .replace(/<h\d[\s\S]*?<\/h\d>/gi, " ")
    .replace(/<sup class=['"][^'"]*(?:crossreference|footnote)[^'"]*['"][\s\S]*?<\/sup>/gi, " ")
    .replace(/<a [^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<\/?(?:div|p|span)\b[^>]*>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ");

  const markerRegex = /<sup class=['"]versenum['"]>(\d+)[^<]*<\/sup>/gi;
  const markers = Array.from(normalized.matchAll(markerRegex));

  if (markers.length === 0) {
    return null;
  }

  return markers
    .map((match, index) => {
      const verse = Number(match[1]);
      const start = (match.index ?? 0) + match[0].length;
      const end = index < markers.length - 1 ? (markers[index + 1].index ?? normalized.length) : normalized.length;
      const text = stripHtml(normalized.slice(start, end));

      if (!Number.isFinite(verse) || !text) {
        return null;
      }

      return { verse, text };
    })
    .filter((item): item is BibleVerse => Boolean(item));
}

export async function fetchPassageVerses(reference: string): Promise<BibleVerse[] | null> {
  try {
    const html = await fetchBibleGatewayPassageHtml(reference);

    if (!html) {
      return null;
    }

    return parseBibleGatewayVerses(html);
  } catch {
    return null;
  }
}
