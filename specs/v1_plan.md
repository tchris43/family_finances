# Family Finance — V1 Plan

Decision-list plan for building V1 against `specs/v1_intent_spec.md`.  
**Status:** locked (Taylor 2026-08-04).

**Ship bar:** Every V1 feature in the intent spec works on first install before the household switches to this app. UI can be plain but must be visually calm and clear (see Look).

---

## Locked product constraints (from intent + plan rulings)

- Full V1 before switch-over (not a partial core-only ship).
- Cloud web app (phone + computer); visually pleasing.
- One shared household email/password.
- Available to Assign is **derived**, never a stored counter that can drift.
- Every transaction has an account; defaults to the account marked **Main**.
- Account balance = starting balance + transactions on that account; manual balance adjust allowed.
- Plan **bucket = spend category** (one list).
- Goals are separate; only **Available → Goal assign** moves goal progress.
- Affordability = simple what-if (cash/Available + estimated goal timeline impact); not a full simulator; does not write transactions.
- No CSV/bank import in V1; **full backup export** only. Manual transaction entry (including on phone).
- Nav: **Home · Plan · Spend · Goals · Decisions**.
- Look: light, calm, soft neutrals, strong typography — not dark-first, not purple/neon AI-dashboard.

---

## Stack

| Piece | Choice |
| --- | --- |
| App | Next.js |
| Host | Vercel |
| DB | Neon (Postgres) |
| Auth | Auth.js credentials — one shared household login |
| Not used | Supabase |

---

## Build order (still one ship — this is sequencing inside V1)

Work in this order so the money model is correct before dashboards pile on. **Do not call V1 done until the full list below ships.**

1. **Foundation** — app shell, Auth.js shared login, Neon schema, household seed, Main account flag.
2. **Accounts + transactions** — CRUD, default Main account, transfers (not spend), income, manual balance adjust, search transactions.
3. **Available + Plan** — derive Available; buckets; assign to bucket; spend hits bucket; overspend allowed; over-assign allowed (Available negative); month rollover of leftover assigned.
4. **Goals** — separate from buckets; assign Available → Goal; progress / remaining / on-track / suggested monthly contribution.
5. **Planned expenses** — checklist with due date; link to bucket; covered when bucket funded enough.
6. **Home** — net worth-ish summary, cash, income/spend, savings rate, goal progress, upcoming expenses, Available to Assign.
7. **Spend** — by bucket, trends, averages, largest categories (charts OK, keep simple).
8. **Decisions** — affordability calculator (cash/Available answer + goal-impact answer).
9. **Backup export** — full data export; restore optional if cheap, else export-only is enough for V1 intent.
10. **Polish pass** — day-one empty state + add account/paycheck path; mobile-friendly transaction entry; visual calm pass.

---

## Screen map

| Nav | Must include on first install |
| --- | --- |
| **Home** | Available, cash/net summary, upcoming (covered/not), goal snapshot, path to add account/paycheck when empty |
| **Plan** | Available, assign to buckets, assign to goals, bucket assigned/spent/remaining |
| **Spend** | Add/edit transactions (amount + bucket required; account defaults Main), transfers, lists, category/bucket reports + simple charts |
| **Goals** | Goal list, targets, progress, on-track, suggested contribution |
| **Cashflow** | Monthly forecast: paychecks, goal contributions, controllable expenses, leftover |
| **Decisions** | Afford purchase / trip-style what-if: cash answer + goal impact |
| **(Utility)** | Accounts manage (Main flag, starting balance, adjust), backup export, search |

Planned expenses: live under **Plan** or **Home** upcoming — one place, linked to buckets.

---

## Data shape (logical — not final SQL)

- **Household** (single for V1; `household_id` on rows so more families later don’t require redesign)
- **User** — shared credentials → one household
- **Account** — name, type, institution, starting balance, is_main, manual adjustments as needed
- **Bucket** — name; fund kind (necessary | unnecessary); sort order; monthly assigned/spent/remaining (remaining derived); rolls leftover to next month
- **Goal** — name, target, current (from assigns), target date, priority; suggested contribution derived
- **Planned expense** — name, amount, due date, recurrence, priority, linked bucket_id; covered derived (shared pool per bucket: earlier due/priority claim first)
- **Transaction** — date, amount, type (income / expense / transfer), bucket (required for expense; income may use an Income bucket or type), account_id (required), transfer_pair for transfers, merchant/notes optional
- **Assignment** — moves Available into a bucket or goal, or moves assigned money bucket↔bucket / goal→goal|bucket (paired +/- rows; Available unchanged for reassigns)
- **Cashflow line** — forecast-only paycheck / expense / goal monthly amount (not ledger); deleting a goal line does not delete the goal

**Available to Assign (derived):**  
sum(account starting balances) + income − sum(all assignment amounts). Spending does not change Available. Bucket/goal reassign transfers net to zero in the assignment sum. Account transfers/adjustments do not affect Available. Overspend is allowed (bucket remaining may go negative).

---

## Auth / security notes

- Single shared login is intentional for V1.
- All queries scoped by household_id.
- HTTPS via Vercel; secrets in env (DATABASE_URL, AUTH_SECRET).

---

## Out of scope (unchanged)

Bank sync, OCR, AI assistant, investment optimization, tax, retirement forecasting, CSV bank import, separate per-person logins, full what-if simulator.

---

## Done when

Intent spec acceptance criteria all pass on a deployed Vercel URL, including phone transaction entry and dashboards, backup export works, and empty day-one path works.

---

## Open items (non-blocking — decide at build if needed)

- Exact “suggested monthly contribution” formula (target remaining / months to date).
- Whether backup restore is in V1 or export-only.
- Income represented as transaction type vs Income bucket (recommend: type=income + optional bucket later).
