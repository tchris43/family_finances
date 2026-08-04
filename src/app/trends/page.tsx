import { AppNav } from "@/components/app-nav";
import { BarList } from "@/components/bar-list";
import { CategoryTrendChart } from "@/components/category-trend-chart";
import { getAvailableToAssignCents } from "@/lib/ledger";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";
import {
  averageMonthlySpend,
  buildCategoryTimeSeries,
  lastNMonths,
  spendingByBucket,
  spendingByBucketByMonth,
  spendingByMonth,
} from "@/lib/trends";

export default async function TrendsPage() {
  const { householdId, db } = await requireSession();
  const available = await getAvailableToAssignCents(db, householdId);

  const byBucket = await spendingByBucket(db, householdId);
  const byMonth = await spendingByMonth(db, householdId);
  const byBucketMonth = await spendingByBucketByMonth(db, householdId);
  const recentMonths = lastNMonths(byMonth, 12);
  const avg = averageMonthlySpend(recentMonths);
  const totalAll = byBucket.reduce((s, b) => s + b.totalCents, 0);
  const top = byBucket.slice(0, 8);

  const monthKeys = recentMonths.map((m) => m.monthKey);
  const topNames = byBucket.slice(0, 6).map((b) => b.bucketName);
  const { seriesKeys, rows } = buildCategoryTimeSeries(
    byBucketMonth.filter((c) => monthKeys.includes(c.monthKey)),
    topNames,
    monthKeys,
  );

  return (
    <>
      <AppNav availableCents={available} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="font-serif text-3xl tracking-tight">Trends</h1>
        <p className="mt-2 text-[var(--muted)]">
          Where money went — by bucket and by month. Expenses only (transfers
          don’t count).
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-white/60 p-5">
            <p className="text-sm text-[var(--muted)]">Total spent (all time)</p>
            <p className="mt-1 font-serif text-3xl tabular-nums">
              {formatCents(totalAll)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-white/60 p-5">
            <p className="text-sm text-[var(--muted)]">
              Avg / month
              {recentMonths.length ? ` (${recentMonths.length} mo)` : ""}
            </p>
            <p className="mt-1 font-serif text-3xl tabular-nums">
              {formatCents(avg)}
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-xl">Spending over time by category</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Top categories for the last 12 months (others rolled into Other)
          </p>
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-white/60 p-3 sm:p-4">
            <CategoryTrendChart rows={rows} seriesKeys={seriesKeys} />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-xl">By bucket</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Largest categories</p>
          <div className="mt-4">
            <BarList
              items={top.map((b) => ({
                label: b.bucketName,
                cents: b.totalCents,
              }))}
            />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-xl">By month</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Last 12 months</p>
          <div className="mt-4">
            <BarList
              items={recentMonths.map((m) => ({
                label: m.monthKey,
                cents: m.totalCents,
              }))}
            />
          </div>
        </section>
      </main>
    </>
  );
}
