import "server-only";
import { randomUUID } from "crypto";
import { extname } from "path";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

export const COMMUNITY_IMAGE_BUCKET = "community-images";
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
] as const;

const EXTENSION_BY_TYPE: Record<(typeof ALLOWED_IMAGE_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "jpg",
  "image/heif": "jpg",
  "image/heic-sequence": "jpg",
  "image/heif-sequence": "jpg",
};

const EXTENSION_BY_FILENAME = {
  ".jpg": "jpg",
  ".jpeg": "jpg",
  ".png": "png",
  ".webp": "webp",
  ".heic": "jpg",
  ".heif": "jpg",
} as const;

function getNormalizedExtension(file: File) {
  const byMime = EXTENSION_BY_TYPE[file.type as keyof typeof EXTENSION_BY_TYPE];

  if (byMime) {
    return byMime;
  }

  const filenameExtension = extname(file.name ?? "").toLowerCase() as keyof typeof EXTENSION_BY_FILENAME;
  return EXTENSION_BY_FILENAME[filenameExtension] ?? null;
}

function shouldConvertToJpeg(file: File) {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.type === "image/heic-sequence" ||
    file.type === "image/heif-sequence" ||
    [".heic", ".heif"].includes(extname(file.name ?? "").toLowerCase())
  );
}

export function validateImageFile(file: File) {
  const filenameExtension = extname(file.name ?? "").toLowerCase();
  const looksLikeImage =
    ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number]) ||
    file.type.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"].includes(filenameExtension);

  if (!looksLikeImage) {
    throw new Error("Please upload a JPG, PNG, WEBP, or HEIC image.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Please upload an image smaller than 8 MB.");
  }
}

export async function uploadPublicImage(file: File, folder: "community-updates" | "events" | "profiles") {
  validateImageFile(file);
  const arrayBuffer = await file.arrayBuffer();
  const originalBuffer = Buffer.from(arrayBuffer);
  const image = sharp(originalBuffer, { failOn: "none" });
  const metadata = await image.metadata();
  const detectedFormat = metadata.format ?? null;

  if (!detectedFormat) {
    throw new Error("One of the selected images could not be read. Please try a different photo.");
  }

  const convertToJpeg =
    shouldConvertToJpeg(file) ||
    !["jpeg", "png", "webp"].includes(detectedFormat);

  const extension = convertToJpeg
    ? "jpg"
    : detectedFormat === "jpeg"
      ? "jpg"
      : detectedFormat === "png" || detectedFormat === "webp"
        ? detectedFormat
        : getNormalizedExtension(file);

  if (!extension) {
    throw new Error("Unsupported image type.");
  }

  const buffer = convertToJpeg
    ? await image.rotate().jpeg({ quality: 90 }).toBuffer()
    : originalBuffer;
  const contentType = convertToJpeg
    ? "image/jpeg"
    : extension === "jpg"
      ? "image/jpeg"
      : `image/${extension}`;

  const admin = createAdminClient();
  const filePath = `${folder}/${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;

  const { error } = await admin.storage.from(COMMUNITY_IMAGE_BUCKET).upload(filePath, buffer, {
    cacheControl: "3600",
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = admin.storage.from(COMMUNITY_IMAGE_BUCKET).getPublicUrl(filePath);

  return data.publicUrl;
}

export async function removePublicImage(publicUrl: string | null | undefined) {
  if (!publicUrl) {
    return;
  }

  const marker = `/storage/v1/object/public/${COMMUNITY_IMAGE_BUCKET}/`;
  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex === -1) {
    return;
  }

  const encodedPath = publicUrl.slice(markerIndex + marker.length);
  const filePath = decodeURIComponent(encodedPath.split("?")[0] ?? "");

  if (!filePath) {
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin.storage.from(COMMUNITY_IMAGE_BUCKET).remove([filePath]);

  if (error) {
    throw new Error(error.message);
  }
}
