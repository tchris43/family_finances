import { auth } from "@/auth";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

/** Lightweight prod diagnostics — does not print secret values. */
export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET?.trim());
  const authUrl = process.env.AUTH_URL?.trim() || null;

  let dbOk = false;
  let dbError: string | null = null;
  if (hasDatabaseUrl) {
    try {
      const db = getDb();
      await db.execute(sql`select 1 as ok`);
      dbOk = true;
    } catch (err) {
      dbError = err instanceof Error ? err.message : String(err);
    }
  }

  let sessionOk = false;
  let hasHouseholdId = false;
  try {
    const session = await auth();
    sessionOk = Boolean(session?.user);
    hasHouseholdId = Boolean(session?.user?.householdId);
  } catch (err) {
    dbError = dbError ?? (err instanceof Error ? err.message : String(err));
  }

  return Response.json({
    ok: hasDatabaseUrl && hasAuthSecret && dbOk,
    hasDatabaseUrl,
    hasAuthSecret,
    authUrl,
    dbOk,
    dbError,
    sessionOk,
    hasHouseholdId,
  });
}
