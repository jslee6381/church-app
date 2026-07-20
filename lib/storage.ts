import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const COMMUNITY_IMAGE_BUCKET = "community-images";
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const EXTENSION_BY_TYPE: Record<(typeof ALLOWED_IMAGE_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new Error("Please upload a JPG, PNG, or WEBP image.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Please upload an image smaller than 8 MB.");
  }
}

export async function uploadPublicImage(file: File, folder: "community-updates" | "events" | "profiles") {
  validateImageFile(file);

  const extension = EXTENSION_BY_TYPE[file.type as keyof typeof EXTENSION_BY_TYPE];

  if (!extension) {
    throw new Error("Unsupported image type.");
  }

  const admin = createAdminClient();
  const filePath = `${folder}/${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await admin.storage.from(COMMUNITY_IMAGE_BUCKET).upload(filePath, buffer, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = admin.storage.from(COMMUNITY_IMAGE_BUCKET).getPublicUrl(filePath);

  return data.publicUrl;
}
