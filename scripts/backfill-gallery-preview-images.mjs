import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_GALLERY_IMAGES = 24;
const PAGE_SIZE = 100;

function extractGoogleDriveFolderId(folderLink) {
  if (!folderLink) {
    return null;
  }

  const value = String(folderLink).trim();
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function getEmbeddedFolderHtmlUrl(folderId) {
  return `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
}

function getGoogleDriveImageUrl(fileId) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
}

function getGoogleDriveViewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

function extractFileIdsFromEmbeddedFolderHtml(html) {
  const ids = new Set();
  const patterns = [
    /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{10,})/g,
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/g,
    /open\?id=([a-zA-Z0-9_-]{10,})/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const fileId = match[1]?.trim();

      if (fileId) {
        ids.add(fileId);
      }
    }
  }

  return [...ids].slice(0, MAX_GALLERY_IMAGES);
}

async function getGoogleDriveGalleryImages(folderLink) {
  const folderId = extractGoogleDriveFolderId(folderLink);

  if (!folderId) {
    return [];
  }

  try {
    const response = await fetch(getEmbeddedFolderHtmlUrl(folderId), {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const fileIds = extractFileIdsFromEmbeddedFolderHtml(html);

    return fileIds.map((fileId) => ({
      id: fileId,
      imageUrl: getGoogleDriveImageUrl(fileId),
      viewUrl: getGoogleDriveViewUrl(fileId),
    }));
  } catch {
    return [];
  }
}

async function loadAllGalleryPosts(supabase) {
  const posts = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("gallery_posts")
      .select("id, drive_link")
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

  const posts = await loadAllGalleryPosts(supabase);

  console.log(`Found ${posts.length} gallery posts.`);

  let updated = 0;
  const failed = [];

  for (const post of posts) {
    const images = await getGoogleDriveGalleryImages(post.drive_link);
    const { error } = await supabase
      .from("gallery_posts")
      .update({
        preview_images: images,
      })
      .eq("id", post.id);

    if (error) {
      failed.push({ id: post.id, reason: error.message });
      continue;
    }

    updated += 1;
    console.log(`Updated ${post.id} -> ${images.length} preview images`);
  }

  console.log("");
  console.log(`Updated: ${updated}`);

  if (failed.length > 0) {
    console.log(`Failed: ${failed.length}`);

    for (const item of failed) {
      console.log(`- ${item.id}: ${item.reason}`);
    }

    process.exitCode = 1;
  }
}

await main();
