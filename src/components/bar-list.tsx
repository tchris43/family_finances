import { formatCents } from "@/lib/money";

export function BarList({
  items,
}: {
  items: { label: string; cents: number }[];
}) {
  const max = Math.max(...items.map((i) => i.cents), 1);

  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">No spending data yet.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const pct = Math.round((item.cents / max) * 100);
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="tabular-nums text-[var(--muted)]">
                {formatCents(item.cents)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
