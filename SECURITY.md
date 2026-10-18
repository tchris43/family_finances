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

## Accounts, admin, and password reset

- **Admin** is the `users.is_admin` flag, checked in the database on every
  admin page load and every admin server action (never read from the session
  token). Nothing in the app sets it; grant it by hand:
  `update users set is_admin = true where email = '...'`.
- **Password reset** has no email step. An admin makes a reset link on `/admin`
  and sends it. Only the SHA-256 of the token is stored; links are single-use,
  expire after 24 hours, and a newer link retires older ones. The password is
  validated before the token is spent, and the token is claimed atomically.
- **Recovery code (self-service):** each household can make a code on the
  Accounts page (needs the current password). It is shown once and stored as a
  SHA-256 hash in `users.recovery_code_hash`; `/forgot` takes email + code + new
  password. It has its own attempt counter (key `recover:<email>`), separate
  from sign-in, so a sign-in lockout can still be fixed. It is not rotated on
  use — making a new one replaces it. It is as strong as a second password:
  treat a leaked code like a leaked password.
- **Sign-in throttle:** 8 failed attempts per email in 15 minutes locks that
  email out (`login_failures`). A reset link or a correct password after the
  window clears it. Changing a password in-app is throttled the same way.
- Security headers are set in `next.config.ts`.

## Not covered here (tracked separately)

- Row-Level Security as a database-enforced backstop (needs a driver change).
- Content-Security-Policy (needs per-request nonces to work with Next).
- Signing out other devices when a password changes — sessions are stateless
  JWTs, so an old session lives until it expires.
- Email-based self-service reset / email verification.
