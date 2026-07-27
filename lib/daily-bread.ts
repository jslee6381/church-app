import { fetchPassageVerses, type BibleVerse } from "@/lib/bible";

const DAILY_BREAD_BASE_URL = "https://bible.ubf.org";
const MAX_LOOKUP_PAGES = 8;

export type DailyBreadEntry = {
  id: string;
  href: string;
  dateLabel: string;
  dateValue: string;
  title: string;
  passageReference: string;
};

export type DailyBreadContent = DailyBreadEntry & {
  fullDateLabel: string;
  keyVerse: string;
  verses: BibleVerse[];
  bodyParagraphs: string[];
  application: string | null;
  oneWord: string | null;
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePassageReference(value: string) {
  return stripTags(value).replace(/~/g, "-");
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseShortDateValue(value: string) {
  const match = /^([A-Z][a-z]{2}) (\d{2}), (\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const [, monthLabel, dayLabel, shortYear] = match;
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(monthLabel);

  if (month < 0) {
    return null;
  }

  return `20${shortYear}-${pad(month + 1)}-${dayLabel}`;
}

function parseLongDateValue(value: string) {
  const parsed = new Date(`${value.trim()} 12:00:00 GMT-0400`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

function addDays(dateValue: string, amount: number) {
  const base = new Date(`${dateValue}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + amount);
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 3600 },
    headers: {
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}`);
  }

  return response.text();
}

export async function getDailyBreadEntries(page: number) {
  const html = await fetchText(`${DAILY_BREAD_BASE_URL}/en/dblist${page > 1 ? `?page=${page}` : ""}`);
  const entries: DailyBreadEntry[] = [];
  const rowRegex =
    /<td><a href="(\/en\/dbdisp\/(\d+)\/menu)"[^>]*>([A-Z][a-z]{2} \d{2}, \d{2})<\/a><\/td>\s*<td><a href="[^"]+"[^>]*>([^<]+)<\/a><\/td>\s*<td>\s*<a href="[^"]+"[^>]*>([\s\S]*?)<\/a>/g;

  for (const match of html.matchAll(rowRegex)) {
    const href = match[1];
    const id = match[2];
    const dateLabel = match[3];
    const passageReference = match[4];
    const title = match[5];
    const dateValue = parseShortDateValue(dateLabel);

    if (!dateValue) {
      continue;
    }

    entries.push({
      id,
      href,
      dateLabel,
      dateValue,
      title: stripTags(title),
      passageReference: normalizePassageReference(passageReference),
    });
  }

  return entries;
}

export async function getDailyBreadEntryForDate(dateValue: string) {
  for (let page = 1; page <= MAX_LOOKUP_PAGES; page += 1) {
    const entries = await getDailyBreadEntries(page);
    const match = entries.find((entry) => entry.dateValue === dateValue);

    if (match) {
      return match;
    }

    if (entries.length === 0) {
      break;
    }

    const oldestEntry = entries.at(-1);

    if (oldestEntry && oldestEntry.dateValue < dateValue) {
      break;
    }
  }

  return null;
}

function extractBodyParagraphs(bodyHtml: string) {
  const bodyWithoutApplication = bodyHtml.replace(
    /<span style=['"]font-weight:\s*bold;['"]>(?:Prayer|Application):<\/span>[\s\S]*$/i,
    "",
  );
  const normalizedBreaks = bodyWithoutApplication
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n");

  return normalizedBreaks
    .split(/\n\s*\n+/)
    .map((part) => stripTags(part.replace(/\n/g, " ")))
    .filter(Boolean);
}

export async function getDailyBreadContent(dateValue: string): Promise<DailyBreadContent | null> {
  const entry = await getDailyBreadEntryForDate(dateValue);

  if (!entry) {
    return null;
  }

  const html = await fetchText(`${DAILY_BREAD_BASE_URL}${entry.href}`);
  const titleMatch = html.match(/<h3><strong>\s*([\s\S]*?)\s*<\/strong><\/h3>/i);
  const fullDateMatch = html.match(/<span style=['"]font-weight:\s*bold;['"]>Date :<\/span>\s*([\s\S]*?)<br\s*\/?>/i);
  const passageLinkMatch = html.match(/<span style=['"]font-weight:\s*bold;['"]>Passage :<\/span>\s*<a [^>]*>([\s\S]*?)<\/a>/i);
  const passageTextMatch = html.match(/<span style=['"]font-weight:\s*bold;['"]>Passage :<\/span>\s*([^<\n]+)<\/br>|<span style=['"]font-weight:\s*bold;['"]>Passage :<\/span>\s*([^<\n]+)/i);
  const keyVerseMatch = html.match(/<span style=['"]font-weight:\s*bold;['"]>Keyverse :<\/span>\s*([^<\n]+)/i);
  const bodyMatch =
    html.match(/<div id=["']dbbody["'][\s\S]*?>([\s\S]*?)<\/div>/i) ??
    html.match(/<div class=['"]panel_body['"] style=['"]padding-top:10px;['"]>\s*([\s\S]*?)<\/div>/i);
  const applicationMatch = html.match(/<span style=['"]font-weight:\s*bold;['"]>(?:Prayer|Application):<\/span>\s*([\s\S]*?)<br\s*\/?>/i);
  const oneWordMatch = html.match(/<span style=['"]font-weight:\s*bold;['"]>One Word:<\/span>\s*([\s\S]*?)<\/div>/i);
  let verses: BibleVerse[] = [];
  const verseRegex = /<th scope="row">(\d+)<\/th>[\s\S]*?<verseid[^>]*>([\s\S]*?)<\/verseid>/g;

  for (const match of html.matchAll(verseRegex)) {
    const verseNumber = Number(match[1]);
    const verseText = stripTags(match[2]);

    if (!Number.isFinite(verseNumber) || !verseText) {
      continue;
    }

    verses.push({
      verse: verseNumber,
      text: verseText,
    });
  }

  const resolvedPassageReference = passageLinkMatch
    ? normalizePassageReference(passageLinkMatch[1])
    : passageTextMatch
      ? normalizePassageReference(passageTextMatch[1] || passageTextMatch[2] || "")
      : entry.passageReference;

  if (verses.length === 0 && resolvedPassageReference) {
    verses = (await fetchPassageVerses(resolvedPassageReference)) ?? [];
  }

  const fullDateLabel = fullDateMatch ? stripTags(fullDateMatch[1]) : entry.dateLabel;
  const parsedDateValue = parseLongDateValue(fullDateLabel) ?? entry.dateValue;

  return {
    ...entry,
    title: titleMatch ? stripTags(titleMatch[1]) : entry.title,
    fullDateLabel,
    dateValue: parsedDateValue,
    passageReference: resolvedPassageReference,
    keyVerse: keyVerseMatch ? stripTags(keyVerseMatch[1]) : "",
    verses,
    bodyParagraphs: bodyMatch ? extractBodyParagraphs(bodyMatch[1]) : [],
    application: applicationMatch ? stripTags(applicationMatch[1]) : null,
    oneWord: oneWordMatch ? stripTags(oneWordMatch[1]) : null,
  };
}

export function getDailyBreadAdjacentDate(dateValue: string, direction: "previous" | "next") {
  return addDays(dateValue, direction === "previous" ? -1 : 1);
}
