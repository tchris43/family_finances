import { createHash, randomBytes } from "crypto";

/** A reset link is valid for a day — long enough to text it, short enough to matter. */
export const RESET_TTL_MS = 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 256 bits of randomness; only the hash is ever stored. */
export function newResetToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}
