import { randomInt } from "crypto";

/** Readable code: 4 groups of 4, no ambiguous characters. */
export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const groups = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join(
      "",
    ),
  );
  return groups.join("-");
}
