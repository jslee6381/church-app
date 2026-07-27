import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BIBLE_GATEWAY_BASE_URL = "https://www.biblegateway.com/passage/";
const PAGE_SIZE = 100;

function formatPassageRange(book, startChapter, startVerse, endChapter, endVerse) {
  if (startChapter === endChapter) {
    if (startVerse === endVerse) {
      return `${book} ${startChapter}:${startVerse}`;
    }

    return `${book} ${startChapter}:${startVerse}-${endVerse}`;
  }

  return `${book} ${startChapter}:${startVerse}-${endChapter}:${endVerse}`;
}

function decodeHtmlEntities(value) {
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

function stripHtml(value) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchBibleGatewayPassageHtml(reference) {
  const url = `${BIBLE_GATEWAY_BASE_URL}?search=${encodeURIComponent(reference)}&version=NIV`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.text();
}

function parseBibleGatewayVerses(html) {
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
    .filter(Boolean);
}

async function fetchPassageVerses(reference) {
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

async function loadAllMaterialPosts(supabase) {
  const posts = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("video_posts")
      .select("id, passage_book, passage_start_chapter, passage_start_verse, passage_end_chapter, passage_end_verse")
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    posts.push(...data);

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return posts;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const posts = await loadAllMaterialPosts(supabase);

  console.log(`Found ${posts.length} material posts.`);

  let updated = 0;
  let cleared = 0;
  const failed = [];

  for (const post of posts) {
    const reference = formatPassageRange(
      post.passage_book,
      post.passage_start_chapter,
      post.passage_start_verse,
      post.passage_end_chapter,
      post.passage_end_verse,
    );
    const verses = await fetchPassageVerses(reference);

    const { error } = await supabase
      .from("video_posts")
      .update({
        passage_verses: verses,
      })
      .eq("id", post.id);

    if (error) {
      failed.push({ id: post.id, reference, reason: error.message });
      continue;
    }

    if (verses && verses.length > 0) {
      updated += 1;
      console.log(`Updated ${reference} -> NIV (${verses.length} verses)`);
    } else {
      cleared += 1;
      console.log(`Cleared ${reference} (no NIV verses fetched)`);
    }
  }

  console.log("");
  console.log(`Updated: ${updated}`);
  console.log(`Cleared: ${cleared}`);

  if (failed.length > 0) {
    console.log(`Failed: ${failed.length}`);

    for (const item of failed) {
      console.log(`- ${item.id} ${item.reference}: ${item.reason}`);
    }

    process.exitCode = 1;
  }
}

await main();
