import { eq } from "drizzle-orm";
import { accounts, buckets } from "@/db/schema";
import type { Db } from "@/db";

/** Buckets every new household starts with. Order = sortOrder. */
export const DEFAULT_BUCKETS: {
  name: string;
  fundKind: "necessary" | "unnecessary";
}[] = [
  { name: "Groceries", fundKind: "necessary" },
  { name: "Housing", fundKind: "necessary" },
  { name: "Transportation", fundKind: "necessary" },
  { name: "Utilities", fundKind: "necessary" },
  { name: "Medical", fundKind: "necessary" },
  { name: "Eating Out", fundKind: "unnecessary" },
  { name: "Entertainment", fundKind: "unnecessary" },
  { name: "Giving", fundKind: "unnecessary" },
  { name: "Fun Money", fundKind: "unnecessary" },
];

/**
 * Give a freshly created household its starting buckets and a Main Checking
 * account. Safe to call once at household creation; no-ops the buckets if some
 * already exist.
 */
export async function seedHouseholdDefaults(db: Db, householdId: string) {
  const existingBuckets = await db
    .select({ id: buckets.id })
    .from(buckets)
    .where(eq(buckets.householdId, householdId));

  if (existingBuckets.length === 0) {
    await db.insert(buckets).values(
      DEFAULT_BUCKETS.map((b, index) => ({
        householdId,
        name: b.name,
        fundKind: b.fundKind,
        sortOrder: index,
      })),
    );
  }

  await db.insert(accounts).values({
    householdId,
    name: "Checking",
    type: "checking",
    institution: null,
    startingBalanceCents: 0,
    isMain: true,
  });
}
