"use server";

import { compare } from "bcryptjs";
import { users } from "@/db/schema";
import {
  clearFailures,
  isLockedOut,
  recordFailure,
} from "@/lib/login-throttle";
import { hashPassword, passwordSchema } from "@/lib/password";
import { requireSession } from "@/lib/session";

export type ChangePasswordResult = { error?: string; ok?: boolean };

export async function changePassword(
  _prev: ChangePasswordResult | undefined,
  formData: FormData,
): Promise<ChangePasswordResult> {
  const { db, session, scoped } = await requireSession();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your password" };
  }
  if (next !== confirm) return { error: "New passwords don't match" };

  const user = await scoped.findById(users, session.user.id);
  if (!user) return { error: "Account not found" };

  // A stolen, unlocked session shouldn't be able to guess the old password.
  const emailKey = user.email.toLowerCase();
  if (await isLockedOut(db, emailKey)) {
    return { error: "Too many attempts. Try again in 15 minutes." };
  }
  if (!(await compare(current, user.passwordHash))) {
    await recordFailure(db, emailKey);
    return { error: "Current password is incorrect" };
  }

  await scoped.updateById(
    users,
    user.id,
    { passwordHash: await hashPassword(next) },
    "Account",
  );
  await clearFailures(db, emailKey);
  return { ok: true };
}
