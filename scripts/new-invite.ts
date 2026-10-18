import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { invites } from "../src/db/schema";
import { generateInviteCode } from "../src/lib/invite-code";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const note = process.argv.slice(2).join(" ") || null;
  const db = drizzle(neon(url));
  const code = generateInviteCode();

  await db.insert(invites).values({ code, note });

  console.log("\nInvite code created:\n");
  console.log(`  ${code}`);
  if (note) console.log(`\n  note: ${note}`);
  console.log("\nLink: <your-site>/signup?code=" + code);
  console.log("(Easier: open /admin in the app and tap Create invite link.)\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
