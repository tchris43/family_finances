import { config } from "dotenv";
import { randomInt } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { invites } from "../src/db/schema";

config({ path: ".env.local" });
config();

/** Readable code: 4 groups of 4, no ambiguous characters. */
function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const groups = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join(
      "",
    ),
  );
  return groups.join("-");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const note = process.argv.slice(2).join(" ") || null;
  const db = drizzle(neon(url));
  const code = generateCode();

  await db.insert(invites).values({ code, note });

  console.log("\nInvite code created:\n");
  console.log(`  ${code}`);
  if (note) console.log(`\n  note: ${note}`);
  console.log("\nSend this with the signup link: /signup\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
