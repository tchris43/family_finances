import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { timeQuery } from "@/lib/page-timing";
import * as schema from "./schema";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(url);
  // Every drizzle query goes through `sql.query`; route it through the page
  // timer so [page] log lines can count queries. A no-op outside a timed page.
  // AUDIT: tied to drizzle-orm/neon-http calling `client.query` (session.js).
  // If a drizzle upgrade calls the client another way, queries stop being
  // counted (logs show 0 queries) — nothing else breaks.
  const timed = new Proxy(sql, {
    get(target, prop, receiver) {
      if (prop === "query") {
        return (...args: Parameters<typeof target.query>) =>
          timeQuery(String(args[0]), () => target.query(...args));
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  return drizzle(timed, { schema });
}

export type Db = ReturnType<typeof getDb>;
