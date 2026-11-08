# Suspected bugs — `src/lib/ledger.ts`

Found while writing the pinning tests in `src/lib/ledger.test.ts` (2026-11-07).
**None of these are fixed.** The tests lock in today's behavior, including what's
listed here, so a fix will turn the named test red on purpose. Update the test
in the same change as the fix.

Ordered by how likely each is to show a family a wrong number today.

---

## 1. Credit card and loan balances add to "Available" — FIXED (uncommitted)

**Ruling (Taylor, 2026-11-07):** leave credit and loan accounts out of
Available entirely: starting balance, income, and adjustments. See
`DEBT_ACCOUNT_TYPES` in `src/lib/ledger.ts`. Investment and "other" accounts
still count; that wasn't part of the ruling.

**What happened before the fix:** Available adds the starting balance of *every* account,
whatever its type. The add-account form takes any number and doesn't say which
sign a debt uses. If someone owes $500 on a credit card and enters `500`,
Available goes **up** $500, as if the debt were cash. Investment accounts count
toward Available the same way.

**Where:** `getAvailableToAssignCents`, the starting-balance sum (no filter on
`accounts.type`). The account balance math has the same sign question.

**Pinned by:** "adds every account's starting balance, whatever the account type".

**Decide:** should debt accounts be entered as negative (and the form say so),
or should some account types be left out of Available altogether?

---

## 2. A positive "expense" counts as more spending, not as a refund

**What happens:** bucket spending sums the *absolute value* of each expense. An
expense saved as `+$200` (a refund) adds $200 to spent instead of taking $200 off.

**Where:** `getBucketSpentThroughCents` and `getBucketSpentInMonthCents`
(`sum(abs(amount_cents))`).

**Today:** probably never triggered. The only place that writes expenses
(`createExpense` in `spend/actions.ts`) always stores them as negative. It
becomes a live bug the day refunds, editing, or a bank import can write a
positive expense.

**Pinned by:** "counts a positive-amount expense as spending, not as a refund".

---

## 3. Income dated in the future is spendable now

**What happens:** a paycheck entered for next Friday raises Available
immediately. There's no date cutoff on the income sum.

**Pinned by:** "counts income dated in the future".

**Decide:** intended (plan with money you know is coming) or not (only assign
money you actually have)? If it's intended, delete this entry.

---

## 4. Assigning money to a future month takes it out of Available now

**What happens:** assigning $40 to December's Groceries lowers Available today.

**Pinned by:** "subtracts assignments for future months right away".

**Likely intended:** it matches the usual budgeting rule that once a dollar is
assigned it's gone from the pool. Listed so it's a decision, not an accident.

---

## 5. Month comparisons are text comparisons (fragile, not broken)

**What happens:** "through this month" compares month keys as text
(`'2026-03' <= '2026-04'`). That only works for zero-padded `YYYY-MM`. A caller
passing `2026-3` would get wrong rollover totals with no error.

**Today:** every caller builds keys with `currentMonthKey` / `monthKeyFromDate`
in `src/lib/money.ts`, which pad. Not pinned by a test, since there's no
current behavior to pin.
