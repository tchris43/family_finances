import { config } from "dotenv";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { accounts, buckets, households, users } from "../src/db/schema";

config({ path: ".env.local" });
config();

const DEFAULT_BUCKETS = [
  "Groceries",
  "Eating Out",
  "Housing",
  "Transportation",
  "Utilities",
  "Entertainment",
  "Medical",
  "Giving",
  "Fun Money",
];

async function ensureBuckets(
  db: ReturnType<typeof drizzle>,
  householdId: string,
) {
  const existing = await db
    .select()
    .from(buckets)
    .where(eq(buckets.householdId, householdId));
  if (existing.length > 0) return;

  await db.insert(buckets).values(
    DEFAULT_BUCKETS.map((name) => ({ householdId, name })),
  );
  console.log(`Seeded ${DEFAULT_BUCKETS.length} buckets.`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  const email = process.env.SEED_EMAIL?.toLowerCase();
  const password = process.env.SEED_PASSWORD;

  if (!url) throw new Error("DATABASE_URL missing");
  if (!email || !password) {
    throw new Error("SEED_EMAIL and SEED_PASSWORD are required");
  }

  const db = drizzle(neon(url));

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`User ${email} already exists.`);
    await ensureBuckets(db, existing[0].householdId);
    return;
  }

  const [household] = await db
    .insert(households)
    .values({ name: "Our Household" })
    .returning();

  const passwordHash = await hash(password, 12);

  await db.insert(users).values({
    householdId: household.id,
    email,
    passwordHash,
  });

  await db.insert(accounts).values({
    householdId: household.id,
    name: "Checking",
    type: "checking",
    institution: null,
    startingBalanceCents: 0,
    isMain: true,
  });

  await ensureBuckets(db, household.id);

  console.log("Seeded household, shared user, and Main Checking account.");
  console.log(`Sign in with: ${email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
