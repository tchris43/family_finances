"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { signIn } from "@/auth";
import { getDb } from "@/db";
import { passwordResets, users } from "@/db/schema";
import { clearFailures } from "@/lib/login-throttle";
import { hashPassword, passwordSchema } from "@/lib/password";
import { hashToken } from "@/lib/tokens";

const INVALID =
  "This reset link is invalid, expired, or already used. Ask for a new one.";

export async function resetPassword(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  // Validate the password BEFORE spending the single-use token, so a typo
  // doesn't burn the link.
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your password" };
  }
  if (password !== confirm) return { error: "Passwords don't match" };
  if (!token) return { error: INVALID };

  const db = getDb();
  const tokenHash = hashToken(token);
  const live = and(
    eq(passwordResets.tokenHash, tokenHash),
    isNull(passwordResets.usedAt),
    gt(passwordResets.expiresAt, sql`now()`),
  );

  // Cheap check first so junk tokens can't make us run bcrypt.
  const [pending] = await db
    .select({ id: passwordResets.id })
    .from(passwordResets)
    .where(live)
    .limit(1);
  if (!pending) return { error: INVALID };

  const passwordHash = await hashPassword(password);

  // Atomic claim: only one request can flip used_at on this token.
  const [claimed] = await db
    .update(passwordResets)
    .set({ usedAt: sql`now()` })
    .where(live)
    .returning({ userId: passwordResets.userId });
  if (!claimed) return { error: INVALID };

  const [user] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, claimed.userId))
    .returning({ email: users.email });
  if (!user) return { error: INVALID };

  await clearFailures(db, user.email.toLowerCase());

  try {
    await signIn("credentials", {
      email: user.email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }
  return {};
}
