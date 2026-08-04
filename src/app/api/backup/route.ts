import { auth } from "@/auth";
import { getDb } from "@/db";
import { buildHouseholdBackup } from "@/lib/backup";

export async function GET() {
  const session = await auth();
  if (!session?.user?.householdId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const backup = await buildHouseholdBackup(
    getDb(),
    session.user.householdId,
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const body = JSON.stringify(backup, null, 2);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="family-finance-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
