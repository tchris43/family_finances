"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { signIn } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  clearFailures,
  isLockedOut,
  recordFailure,
} from "@/lib/login-throttle";
import { hashPassword, passwordSchema } from "@/lib/password";
import { recoveryCodeMatches } from "@/lib/recovery";

const NO_MATCH = "That email and recovery code don't match.";

const schema = z.object({
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email"),
  code: z.string().trim().min(1, "Enter your recovery code").max(60),
  password: passwordSchema,
});

/** `email` is echoed back so a typo doesn't wipe the form (React clears it). */
export type ForgotResult = { error?: string; email?: string };

export async function recoverWithCode(
  _prev: ForgotResult | undefined,
  formData: FormData,
): Promise<ForgotResult> {
  const typedEmail = String(formData.get("email") ?? "");
  const fail = (error: string): ForgotResult => ({ error, email: typedEmail });

  const parsed = schema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check your details");
  }
  const { email, code, password } = parsed.data;
  if (password !== String(formData.get("confirm") ?? "")) {
    return fail("Passwords don't match");
  }

  const db = getDb();
  // Separate from the sign-in throttle, so being locked out of sign-in is
  // exactly the situation this page can still fix. Counted for unknown emails
  // too, so it can't be used to discover who has an account.
  const recoverKey = `recover:${email}`;
  if (await isLockedOut(db, recoverKey)) {
    return fail(
      "Too many attempts. Wait 15 minutes, or ask for a password reset link.",
    );
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      recoveryCodeHash: users.recoveryCodeHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !recoveryCodeMatches(code, user.recoveryCodeHash)) {
    await recordFailure(db, recoverKey);
    return fail(NO_MATCH);
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(users.id, user.id));
  await clearFailures(db, recoverKey);
  await clearFailures(db, email);

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }
  return {};
}
