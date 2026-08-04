import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { households, users } from "../src/db/schema";

config({ path: ".env.local" });
config();

/**
 * Deletes the seeded household (cascades accounts, buckets, goals,
 * transactions, assignments, planned expenses, users).
 */
async function main() {
  const url = process.env.DATABASE_URL;
  const email = process.env.SEED_EMAIL?.toLowerCase();
  if (!url) throw new Error("DATABASE_URL missing");
  if (!email) throw new Error("SEED_EMAIL missing");

  const db = drizzle(neon(url));

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length === 0) {
    console.log(`No user for ${email} — nothing to wipe.`);
    return;
  }

  const householdId = existing[0].householdId;
  await db.delete(households).where(eq(households.id, householdId));
  console.log(`Wiped household ${householdId} (and cascaded data).`);
  console.log("Run: npm run db:seed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
