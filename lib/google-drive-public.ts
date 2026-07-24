export function extractGoogleDriveFolderId(input?: string | null) {
  const value = input?.trim();

  if (!value) {
    return null;
  }

  const folderMatch = value.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch?.[1]) {
    return folderMatch[1];
  }

  const idMatch = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch?.[1]) {
    return idMatch[1];
  }

  if (/^[a-zA-Z0-9_-]{10,}$/.test(value)) {
    return value;
  }

  return null;
}

export function getEmbeddedGoogleDriveFolderUrl(input?: string | null, mode: "grid" | "list" = "grid") {
  const folderId = extractGoogleDriveFolderId(input);

  if (!folderId) {
    return null;
  }

  return `https://drive.google.com/embeddedfolderview?id=${folderId}#${mode}`;
}
