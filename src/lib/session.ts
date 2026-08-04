import { auth } from "@/auth";
import { getDb } from "@/db";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.householdId) {
    throw new Error("Unauthorized");
  }
  return {
    session,
    householdId: session.user.householdId,
    db: getDb(),
  };
}
