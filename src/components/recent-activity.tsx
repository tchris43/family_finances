"use client";

import { deleteTransaction } from "@/app/spend/actions";
import { useOptimisticTransactions } from "@/components/optimistic-transactions";
import { SubmitButton } from "@/components/submit-button";
import { formatCents } from "@/lib/money";

/** Home's "Recent activity" rows, read from the shared optimistic list. */
export function RecentActivityList({
  accountName,
  bucketName,
  searching,
}: {
  accountName: Record<string, string>;
  bucketName: Record<string, string>;
  searching: boolean;
}) {
  const { transactions } = useOptimisticTransactions();

  return (
    <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
      {transactions.length === 0 ? (
        <li className="py-4 text-sm text-[var(--muted)]">
          {searching ? "No matches." : "No transactions yet — use + Transaction."}
        </li>
      ) : (
        transactions.map((tx) => (
          <li
            key={tx.id}
            className={`flex items-start justify-between gap-4 py-3 ${
              tx.pending ? "opacity-60" : ""
            }`}
          >
            <div>
              <p className="font-medium">
                {tx.merchant ||
                  (tx.type === "transfer"
                    ? "Transfer"
                    : tx.type === "adjustment"
                      ? "Balance adjustment"
                      : tx.type)}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {tx.date} · {accountName[tx.accountId] ?? "Account"}
                {tx.bucketId ? ` · ${bucketName[tx.bucketId] ?? "Bucket"}` : ""}
                {tx.notes ? ` · ${tx.notes}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className={`tabular-nums ${tx.amountCents < 0 ? "text-red-800" : ""}`}>
                {formatCents(tx.amountCents)}
              </p>
              {tx.pending ? (
                // No real id yet, so nothing to delete.
                <span className="text-xs text-[var(--muted)]">Saving…</span>
              ) : (
                <form action={deleteTransaction}>
                  <input type="hidden" name="id" value={tx.id} />
                  <SubmitButton
                    pendingLabel="Deleting…"
                    className="text-xs text-[var(--muted)] hover:text-red-700"
                  >
                    Delete
                  </SubmitButton>
                </form>
              )}
            </div>
          </li>
        ))
      )}
    </ul>
  );
}
