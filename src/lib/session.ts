import { auth } from "@/auth";
import { getDb } from "@/db";
import { scopedDb } from "@/lib/scoped-db";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.householdId) {
    throw new Error("Unauthorized");
  }
  const householdId = session.user.householdId;
  const db = getDb();
  return {
    session,
    householdId,
    db,
    /** Household-bound query helper — prefer this over raw `db` for tenant tables. */
    scoped: scopedDb(db, householdId),
  };
}
