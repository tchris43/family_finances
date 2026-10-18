import { hash } from "bcryptjs";
import { z } from "zod";

/** bcrypt only uses the first 72 bytes, so longer input would be silently cut. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer");

export function hashPassword(password: string) {
  return hash(password, 12);
}
