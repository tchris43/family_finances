/** Money helpers — amounts in integer cents. */

export function dollarsToCents(dollars: string | number): number {
  const n = typeof dollars === "number" ? dollars : Number.parseFloat(dollars);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function monthKeyFromDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d + "T12:00:00") : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function currentMonthKey(): string {
  return monthKeyFromDate(new Date());
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
