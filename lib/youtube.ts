export function extractYouTubeVideoId(input?: string | null) {
  const value = input?.trim();

  if (!value) {
    return null;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:[?&]v=)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  return null;
}

export function getYouTubeThumbnailUrl(input?: string | null) {
  const videoId = extractYouTubeVideoId(input);

  if (!videoId) {
    return null;
  }

  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeWatchUrl(input?: string | null) {
  const videoId = extractYouTubeVideoId(input);

  if (!videoId) {
    return null;
  }

  return `https://www.youtube.com/watch?v=${videoId}`;
}
