import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";

/** Looks the flag up in the DB each time — never trusts the session token for it. */
export async function isAdminUser(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const [row] = await getDb()
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.isAdmin === true;
}

/** For server actions: throws unless the caller is an admin. */
export async function requireAdminAction() {
  const session = await auth();
  if (!(await isAdminUser(session?.user?.id))) throw new Error("Unauthorized");
  return { db: getDb(), userId: session!.user!.id };
}

/** For pages: sends non-admins home. */
export async function requireAdminPage() {
  const session = await auth();
  if (!(await isAdminUser(session?.user?.id))) redirect("/");
  return { db: getDb(), userId: session!.user!.id };
}
