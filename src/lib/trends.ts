import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { buckets, transactions } from "@/db/schema";

export type BucketSpend = {
  bucketId: string | null;
  bucketName: string;
  totalCents: number;
};

export type MonthSpend = {
  monthKey: string;
  totalCents: number;
};

/** Expense totals by bucket (absolute cents). */
export async function spendingByBucket(
  db: Db,
  householdId: string,
): Promise<BucketSpend[]> {
  const rows = await db
    .select({
      bucketId: transactions.bucketId,
      totalCents: sql<number>`coalesce(sum(abs(${transactions.amountCents})), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.type, "expense"),
      ),
    )
    .groupBy(transactions.bucketId)
    .orderBy(desc(sql`sum(abs(${transactions.amountCents}))`));

  const bucketList = await db
    .select()
    .from(buckets)
    .where(eq(buckets.householdId, householdId));
  const names = Object.fromEntries(bucketList.map((b) => [b.id, b.name]));

  return rows.map((row) => ({
    bucketId: row.bucketId,
    bucketName: row.bucketId
      ? (names[row.bucketId] ?? "Unknown")
      : "Uncategorized",
    totalCents: Number(row.totalCents),
  }));
}

/** Expense totals by calendar month (YYYY-MM). */
export async function spendingByMonth(
  db: Db,
  householdId: string,
): Promise<MonthSpend[]> {
  const rows = await db
    .select({
      monthKey: sql<string>`to_char(${transactions.date}::timestamp, 'YYYY-MM')`,
      totalCents: sql<number>`coalesce(sum(abs(${transactions.amountCents})), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.type, "expense"),
      ),
    )
    .groupBy(sql`to_char(${transactions.date}::timestamp, 'YYYY-MM')`)
    .orderBy(sql`to_char(${transactions.date}::timestamp, 'YYYY-MM')`);

  return rows.map((row) => ({
    monthKey: row.monthKey,
    totalCents: Number(row.totalCents),
  }));
}

export function averageMonthlySpend(months: MonthSpend[]): number {
  if (months.length === 0) return 0;
  const sum = months.reduce((s, m) => s + m.totalCents, 0);
  return Math.round(sum / months.length);
}

export function lastNMonths(months: MonthSpend[], n: number): MonthSpend[] {
  return months.slice(-n);
}

export type BucketMonthSpend = {
  monthKey: string;
  bucketId: string | null;
  bucketName: string;
  totalCents: number;
};

/** Expense totals by month × bucket. */
export async function spendingByBucketByMonth(
  db: Db,
  householdId: string,
): Promise<BucketMonthSpend[]> {
  const rows = await db
    .select({
      monthKey: sql<string>`to_char(${transactions.date}::timestamp, 'YYYY-MM')`,
      bucketId: transactions.bucketId,
      totalCents: sql<number>`coalesce(sum(abs(${transactions.amountCents})), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.type, "expense"),
      ),
    )
    .groupBy(
      sql`to_char(${transactions.date}::timestamp, 'YYYY-MM')`,
      transactions.bucketId,
    )
    .orderBy(sql`to_char(${transactions.date}::timestamp, 'YYYY-MM')`);

  const bucketList = await db
    .select()
    .from(buckets)
    .where(eq(buckets.householdId, householdId));
  const names = Object.fromEntries(bucketList.map((b) => [b.id, b.name]));

  return rows.map((row) => ({
    monthKey: row.monthKey,
    bucketId: row.bucketId,
    bucketName: row.bucketId
      ? (names[row.bucketId] ?? "Unknown")
      : "Uncategorized",
    totalCents: Number(row.totalCents),
  }));
}

/**
 * Build recharts rows for the last N months, keeping the top K buckets
 * (by all-time total) as separate series; fold the rest into Other.
 */
export function buildCategoryTimeSeries(
  cells: BucketMonthSpend[],
  topBucketNames: string[],
  monthKeys: string[],
): { seriesKeys: string[]; rows: Record<string, string | number>[] } {
  const keep = new Set(topBucketNames);
  const seriesKeys = [...topBucketNames];
  if (cells.some((c) => !keep.has(c.bucketName))) {
    seriesKeys.push("Other");
  }

  const rows = monthKeys.map((monthKey) => {
    const row: Record<string, string | number> = { month: monthKey };
    for (const key of seriesKeys) row[key] = 0;

    for (const cell of cells.filter((c) => c.monthKey === monthKey)) {
      const key = keep.has(cell.bucketName) ? cell.bucketName : "Other";
      row[key] = (Number(row[key]) || 0) + cell.totalCents / 100;
    }
    return row;
  });

  return { seriesKeys, rows };
}
