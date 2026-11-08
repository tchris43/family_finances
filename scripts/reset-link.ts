// Break-glass password reset for when nobody can reach /admin (e.g. the only
// admin is locked out with no recovery code). Usage: npm run reset:link <email>
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { passwordResets, users } from "../src/db/schema";
import { clearFailures } from "../src/lib/login-throttle";
import { newResetToken, RESET_TTL_MS } from "../src/lib/tokens";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run reset:link <email>");

  // AUDIT: built exactly like getDb() so the throttle helpers accept it; if
  // getDb() gains extra config, mirror it here or the types will drift.
  const db = drizzle(neon(url), { schema });

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) throw new Error(`No account with email ${email}`);

  // Same rule as the admin button: only the newest link works.
  await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResets.userId, user.id), isNull(passwordResets.usedAt)));

  const { token, tokenHash } = newResetToken();
  await db.insert(passwordResets).values({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });

  // Both throttles: sign-in is keyed by the bare email, recovery by recover:<email>.
  await clearFailures(db, email);
  await clearFailures(db, `recover:${email}`);

  const origin = (process.env.AUTH_URL ?? "<your-site>").replace(/\/$/, "");
  console.log(`\nReset link for ${user.email} (one use, expires in 24 hours):\n`);
  console.log(`  ${origin}/reset?token=${token}`);
  console.log("\nAny earlier unused reset links for this account no longer work.");
  console.log("Sign-in lockout cleared.\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
