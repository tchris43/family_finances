# Family Finance — local setup

## 1. Create `.env.local`

```powershell
copy .env.example .env.local
```

Edit `.env.local` and set:

- `DATABASE_URL` — Neon connection string
- `AUTH_SECRET` — the secret you generated
- `AUTH_URL` — `http://localhost:3000`
- `SEED_EMAIL` / `SEED_PASSWORD` — shared household login

## 2. Push schema + seed

```powershell
npm run db:push
npm run db:seed
```

## 3. Run the app

```powershell
npm run dev
```

Open http://localhost:3000 and sign in with `SEED_EMAIL` / `SEED_PASSWORD`.

## 4. Least-privilege DB role (shared / production)

Once other households use the app, the running app should not connect as the
database owner. Create a CRUD-only role and point the app at it:

```bash
psql "<owner connection string>" -f scripts/create-app-role.sql
```

Edit the password in that file first. Then:

- App `DATABASE_URL` → the `family_finances_app` role.
- Keep the owner connection string only where you run `npm run db:push`
  (migrations), not in the deployed app's environment.

See `SECURITY.md` for how tenant isolation is enforced in code.

## Inviting another household

Signup is invite-only. The easy way: sign in as an admin, open **Accounts →
Open admin** (`/admin`), tap **Create invite link**, and send the link — the
code is already filled in. Each link works once.

Command-line alternative: `npm run invite:new "for the Smiths"` prints a code.

## Forgotten password

Self-service: each household makes a **recovery code** on Accounts (the Home
screen and the first-login walkthrough nudge them to). On `/forgot` they enter
email + code + a new password and are signed in.

If they never saved a code: on `/admin`, tap **Reset password link** next to
their login and send them the link (one use, 24 hours).

## Making someone an admin

There is no screen for it on purpose. Run once against the database:

```sql
update users set is_admin = true where email = 'you@example.com';
```

## Notes

- `npm run db:push` also creates the `household_id` indexes defined in
  `src/db/schema.ts` — run it after pulling schema changes.
- `npm run db:seed` / `npm run db:wipe` refuse to run when
  `NODE_ENV=production` (override with `ALLOW_SEED=1` / `ALLOW_WIPE=1`).
