import { createHmac, randomBytes } from "crypto";

function getSecret() {
  const secret = process.env.MEMBER_SESSION_SECRET ?? process.env.INVITATION_TOKEN_SECRET;

  if (!secret && process.env.NODE_ENV !== "production") {
    return "grace-community-local-dev-secret";
  }

  if (!secret) {
    throw new Error("Missing MEMBER_SESSION_SECRET or INVITATION_TOKEN_SECRET");
  }

  return secret;
}

export function hashOpaqueValue(value: string) {
  return createHmac("sha256", getSecret()).update(value.trim()).digest("hex");
}

export function generateOpaqueToken(size = 32) {
  return randomBytes(size).toString("hex");
}

export function signValue(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}
