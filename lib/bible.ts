export type BibleBook = {
  book: string;
  testament: "OT" | "NT";
  chapterCount: number;
};

export type BibleVerse = {
  chapter?: number;
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

function normalizeReferenceDashes(value: string) {
  return value.replace(/[–—~]/g, "-").trim();
}

function parseReference(reference: string) {
  const normalized = normalizeReferenceDashes(reference);
  const match = normalized.match(/^(.*?)\s+(\d+)(?::(\d+)(?:-(\d+(?::\d+)?)?)?)?$/);

  if (!match) {
    return null;
  }

  const book = match[1].trim();
  const startChapter = Number(match[2]);
  const startVerse = match[3] ? Number(match[3]) : null;
  const endPart = match[4] ?? null;

  if (!book || !Number.isFinite(startChapter)) {
    return null;
  }

  if (!startVerse) {
    return {
      book,
      startChapter,
      startVerse: null,
      endChapter: startChapter,
      endVerse: null,
      isWholeChapter: true,
    };
  }

  if (!endPart) {
    return {
      book,
      startChapter,
      startVerse,
      endChapter: startChapter,
      endVerse: startVerse,
      isWholeChapter: false,
    };
  }

  const parsedEnd = parseVerseRangePart(endPart);

  if (!parsedEnd || !Number.isFinite(parsedEnd.verse)) {
    return null;
  }

  return {
    book,
    startChapter,
    startVerse,
    endChapter: parsedEnd.chapter ?? startChapter,
    endVerse: parsedEnd.verse,
    isWholeChapter: false,
  };
}

function parseVerseRangePart(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const crossChapterMatch = /^(\d+):(\d+)$/.exec(trimmed);

  if (crossChapterMatch) {
    return {
      chapter: Number(crossChapterMatch[1]),
      verse: Number(crossChapterMatch[2]),
    };
  }

  const sameChapterMatch = /^(\d+)$/.exec(trimmed);

  if (sameChapterMatch) {
    return {
      chapter: null,
      verse: Number(sameChapterMatch[1]),
    };
  }

  return null;
}

function extractReferenceBounds(reference: string) {
  const parsed = parseReference(reference);

  if (!parsed || parsed.startVerse === null) {
    return null;
  }

  const startVerse = parsed.startVerse;
  const endVerse = parsed.endVerse ?? startVerse;

  return {
    startChapter: parsed.startChapter,
    startVerse,
    endChapter: parsed.endChapter,
    endVerse,
    isSingleVerse: startVerse === endVerse && parsed.startChapter === parsed.endChapter,
    isWholeChapter: false,
  };
}

function filterVersesByReference(reference: string, verses: BibleVerse[]) {
  const bounds = extractReferenceBounds(reference);

  if (!bounds) {
    return verses;
  }

  if (bounds.startChapter !== bounds.endChapter) {
    return verses;
  }

  return verses.filter((verse) => verse.verse >= bounds.startVerse && verse.verse <= bounds.endVerse);
}

function withChapter(verses: BibleVerse[], chapter: number) {
  return verses.map((verse) => ({
    ...verse,
    chapter,
  }));
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
    const parsedReference = parseReference(reference);

    if (parsedReference && !parsedReference.isWholeChapter && parsedReference.startChapter !== parsedReference.endChapter) {
      const chapterVerses: BibleVerse[] = [];

      for (let chapter = parsedReference.startChapter; chapter <= parsedReference.endChapter; chapter += 1) {
        const html = await fetchBibleGatewayPassageHtml(`${parsedReference.book} ${chapter}`);

        if (!html) {
          return null;
        }

        const parsedChapterVerses = parseBibleGatewayVerses(html);

        if (!parsedChapterVerses) {
          return null;
        }

        const boundedChapterVerses = parsedChapterVerses.filter((verse) => {
          if (chapter === parsedReference.startChapter) {
            return verse.verse >= (parsedReference.startVerse ?? 1);
          }

          if (chapter === parsedReference.endChapter) {
            return verse.verse <= (parsedReference.endVerse ?? verse.verse);
          }

          return true;
        });

        chapterVerses.push(...withChapter(boundedChapterVerses, chapter));
      }

      return chapterVerses;
    }

    const html = await fetchBibleGatewayPassageHtml(reference);

    if (!html) {
      return null;
    }

    const verses = parseBibleGatewayVerses(html);

    if (!verses) {
      return null;
    }

    if (parsedReference) {
      return withChapter(
        filterVersesByReference(reference, verses),
        parsedReference.startChapter,
      );
    }

    return verses;
  } catch {
    return null;
  }
}
