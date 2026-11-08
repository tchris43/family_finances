"use client";

import { createContext, useContext, useOptimistic, type ReactNode } from "react";

/** The fields Home's "Recent activity" list renders. */
export type ActivityTx = {
  id: string;
  type: string;
  amountCents: number;
  date: string;
  merchant: string | null;
  notes: string | null;
  accountId: string;
  bucketId: string | null;
  /** True for a row shown before the server has confirmed it. */
  pending?: boolean;
};

type Ctx = {
  transactions: ActivityTx[];
  addOptimistic: (rows: ActivityTx[]) => void;
};

const OptimisticTransactions = createContext<Ctx | null>(null);

/**
 * Holds Home's transaction list so the "+ Transaction" dialog (in the header)
 * and the "Recent activity" list (further down) share one optimistic state —
 * the same useOptimistic pattern as the shopping list.
 */
export function OptimisticTransactionsProvider({
  transactions,
  searching,
  children,
}: {
  transactions: ActivityTx[];
  /** While a search is active, a new row may not match it, so don't insert one. */
  searching: boolean;
  children: ReactNode;
}) {
  const [optimistic, add] = useOptimistic(
    transactions,
    (list: ActivityTx[], rows: ActivityTx[]) => insertByDate(list, rows),
  );
  // AUDIT: must be called inside a form action / transition, or React drops
  // the optimistic row immediately (and warns). Every caller is a form action.
  const addOptimistic = (rows: ActivityTx[]) => {
    if (!searching) add(rows);
  };
  return (
    <OptimisticTransactions.Provider value={{ transactions: optimistic, addOptimistic }}>
      {children}
    </OptimisticTransactions.Provider>
  );
}

/** Matches the server's order (newest date first) so a back-dated entry lands where it will stay. */
function insertByDate(list: ActivityTx[], rows: ActivityTx[]) {
  const next = [...list];
  for (const row of rows) {
    const at = next.findIndex((tx) => tx.date <= row.date);
    next.splice(at === -1 ? next.length : at, 0, row);
  }
  return next;
}

export function useOptimisticTransactions(): Ctx {
  const ctx = useContext(OptimisticTransactions);
  // Outside Home there is no list to update; adding is then a no-op.
  return ctx ?? { transactions: [], addOptimistic: () => {} };
}
