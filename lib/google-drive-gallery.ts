import "server-only";

import { extractGoogleDriveFolderId } from "@/lib/google-drive-public";

export type GoogleDriveGalleryImage = {
  id: string;
  imageUrl: string;
  viewUrl: string;
};

const MAX_GALLERY_IMAGES = 24;

function getEmbeddedFolderHtmlUrl(folderId: string) {
  return `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
}

function getGoogleDriveImageUrl(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
}

function getGoogleDriveViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

function extractFileIdsFromEmbeddedFolderHtml(html: string) {
  const ids = new Set<string>();
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

export async function getGoogleDriveGalleryImages(folderLink?: string | null): Promise<GoogleDriveGalleryImage[]> {
  const folderId = extractGoogleDriveFolderId(folderLink);

  if (!folderId) {
    return [];
  }

  try {
    const response = await fetch(getEmbeddedFolderHtmlUrl(folderId), {
      next: { revalidate: 300 },
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
