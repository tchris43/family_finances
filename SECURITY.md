# Security notes

## Tenant isolation

Every row belongs to exactly one household via a `household_id` column. All
data access is scoped to the signed-in user's household.

**The rule:** never call `db.select().from(<tenant table>)` (or
`.update` / `.delete`) directly in a page or action. Instead:

- Use `scoped.*` from `requireSession()` — `scoped.select`, `scoped.findById`,
  `scoped.requireById`, `scoped.insert`, `scoped.updateById`, `scoped.deleteById`.
  These force `household_id` into every WHERE and every INSERT, and the
  by-id mutations run as a single `... WHERE id = ? AND household_id = ?`
  statement (no separate ownership check to forget).
- For aggregate / multi-table queries that don't fit the helper, take an
  explicit `householdId: string` parameter and put
  `eq(table.householdId, householdId)` in the WHERE yourself. See
  `src/lib/ledger.ts` and `src/lib/goals.ts` for the pattern.

The raw handle is still reachable as `scoped.db` for those cases, plus a few
legitimate scoped bulk operations (e.g. clearing one household's checked
shopping items).

## Least-privilege database role

The running app connects as `family_finances_app`, a role with only
`SELECT / INSERT / UPDATE / DELETE` on the app tables — no DDL, no `TRUNCATE`,
no `CREATEROLE`, no `BYPASSRLS`. See `scripts/create-app-role.sql`.

Schema migrations (`npm run db:push`) use a separate owner connection string,
kept out of the deployed app's environment.

## Not covered here (tracked separately)

- Row-Level Security as a database-enforced backstop (needs a driver change).
- Login rate limiting / brute-force protection.
- Email verification and password reset.
- Security headers / CSP.
