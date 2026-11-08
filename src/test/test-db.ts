import { PGlite } from "@electric-sql/pglite";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import { drizzle } from "drizzle-orm/pglite";
import type { Db } from "@/db";
import * as schema from "@/db/schema";
import {
  accounts,
  assignments,
  buckets,
  households,
  transactions,
} from "@/db/schema";

/**
 * A real Postgres (PGlite, in-process — no network, no Neon) with the app's
 * schema applied, so ledger SQL (sum, coalesce, to_char, string month compare)
 * runs exactly as Postgres runs it.
 * AUDIT: the CREATE statements come from src/db/schema.ts via drizzle-kit, the
 * same source `npm run db:push` uses. If prod drifts from schema.ts (a manual
 * ALTER), these tests won't see it.
 */
export async function createTestDb() {
  const client = new PGlite();
  const statements = await generateMigration(
    generateDrizzleJson({}),
    generateDrizzleJson(schema),
  );
  for (const statement of statements) await client.exec(statement);
  // AUDIT: the app's Db type is the neon-http driver; the ledger only uses
  // select/from/where, which both drivers share, so the cast is safe there.
  const db = drizzle(client, { schema }) as unknown as Db;
  return { db, close: () => client.close() };
}

/** Insert helpers: each returns the new id and fills required columns. */
export function fixtures(db: Db) {
  return {
    async household(name = "Test household") {
      const [row] = await db.insert(households).values({ name }).returning();
      return row.id;
    },
    async account(householdId: string, startingBalanceCents = 0, type = "checking") {
      const [row] = await db
        .insert(accounts)
        .values({ householdId, name: `${type} account`, type, startingBalanceCents })
        .returning();
      return row.id;
    },
    async bucket(householdId: string, name = "Groceries") {
      const [row] = await db.insert(buckets).values({ householdId, name }).returning();
      return row.id;
    },
    async tx(
      householdId: string,
      accountId: string,
      type: "income" | "expense" | "transfer" | "adjustment",
      amountCents: number,
      date: string,
      bucketId: string | null = null,
    ) {
      await db.insert(transactions).values({
        householdId,
        accountId,
        bucketId,
        type,
        amountCents,
        date,
      });
    },
    async assign(
      householdId: string,
      bucketId: string | null,
      amountCents: number,
      monthKey: string,
    ) {
      await db
        .insert(assignments)
        .values({ householdId, bucketId, goalId: null, amountCents, monthKey });
    },
  };
}
