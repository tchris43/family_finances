"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { signIn } from "@/auth";
import { getDb } from "@/db";
import { households, invites, users } from "@/db/schema";
import { seedHouseholdDefaults } from "@/lib/defaults";
import { hashPassword, passwordSchema } from "@/lib/password";

const schema = z.object({
  code: z.string().trim().min(1, "Enter your invite code"),
  householdName: z.string().trim().max(80).optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: passwordSchema,
});

export async function signUp(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = schema.safeParse({
    code: formData.get("code"),
    householdName: formData.get("householdName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  }
  const { code, householdName, email, password } = parsed.data;

  const db = getDb();

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingUser) {
    return { error: "That email is already registered. Sign in instead." };
  }

  // Claim the invite atomically: only one caller can flip redeemed_at.
  const claimed = await db
    .update(invites)
    .set({ redeemedAt: sql`now()` })
    .where(and(eq(invites.code, code), isNull(invites.redeemedAt)))
    .returning({ id: invites.id });
  if (claimed.length === 0) {
    return { error: "That invite code is invalid or has already been used." };
  }
  const inviteId = claimed[0].id;

  const [household] = await db
    .insert(households)
    .values({ name: householdName || "Our Household" })
    .returning();

  try {
    const passwordHash = await hashPassword(password);
    await db.insert(users).values({
      householdId: household.id,
      email,
      passwordHash,
    });
    await seedHouseholdDefaults(db, household.id);
  } catch {
    return {
      error:
        "Something went wrong creating your account. Contact whoever sent your invite.",
    };
  }

  await db
    .update(invites)
    .set({ redeemedHouseholdId: household.id })
    .where(eq(invites.id, inviteId));

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      // Account exists now; send them to sign in manually.
      redirect("/login");
    }
    throw error;
  }

  return {};
}
