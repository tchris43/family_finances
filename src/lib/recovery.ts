import { createHash, randomInt, timingSafeEqual } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 4 groups of 5 from a 32-letter alphabet = 100 bits. Shown once, stored hashed. */
export function generateRecoveryCode(): string {
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(
      "",
    ),
  ).join("-");
}

/** Forgiving about case, spaces, and dashes when someone retypes it. */
function normalize(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalize(code)).digest("hex");
}

export function recoveryCodeMatches(
  input: string,
  storedHash: string | null | undefined,
): boolean {
  if (!storedHash) return false;
  const a = Buffer.from(hashRecoveryCode(input), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
