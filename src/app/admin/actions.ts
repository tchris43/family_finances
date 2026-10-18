"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { invites, passwordResets, users } from "@/db/schema";
import { requireAdminAction } from "@/lib/admin";
import { generateInviteCode } from "@/lib/invite-code";
import { newResetToken, RESET_TTL_MS } from "@/lib/tokens";

export type AdminResult = {
  error?: string;
  code?: string;
  token?: string;
  email?: string;
};

export async function createInvite(
  _prev: AdminResult | undefined,
  formData: FormData,
): Promise<AdminResult> {
  const { db } = await requireAdminAction();
  const note = String(formData.get("note") ?? "").trim().slice(0, 80) || null;
  const code = generateInviteCode();
  await db.insert(invites).values({ code, note });
  revalidatePath("/admin");
  return { code };
}

export async function revokeInvite(formData: FormData) {
  const { db } = await requireAdminAction();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Only unused invites can be revoked; a redeemed one is history.
  await db
    .delete(invites)
    .where(and(eq(invites.id, id), isNull(invites.redeemedAt)));
  revalidatePath("/admin");
}

export async function createResetLink(
  _prev: AdminResult | undefined,
  formData: FormData,
): Promise<AdminResult> {
  const { db } = await requireAdminAction();
  const userId = String(formData.get("userId") ?? "");

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return { error: "Account not found" };

  // Only the newest link works: retire any earlier unused ones.
  await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResets.userId, user.id), isNull(passwordResets.usedAt)));

  const { token, tokenHash } = newResetToken();
  await db.insert(passwordResets).values({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });
  return { token, email: user.email };
}
