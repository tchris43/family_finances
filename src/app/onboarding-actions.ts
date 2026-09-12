"use server";

import { eq } from "drizzle-orm";
import { households } from "@/db/schema";
import { requireSession } from "@/lib/session";

/** Marks the household as past the first-login walkthrough (dismissed or finished). */
export async function completeOnboarding() {
  const { db, householdId } = await requireSession();
  await db
    .update(households)
    .set({ onboardedAt: new Date() })
    .where(eq(households.id, householdId));
}
