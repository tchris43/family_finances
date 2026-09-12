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

Signup is invite-only. Generate a single-use code:

```bash
npm run invite:new "for the Smiths"
```

Send the printed code plus the `/signup` link. They pick a household name, a
shared email, and a shared password; the code can't be reused.

## Notes

- `npm run db:push` also creates the `household_id` indexes defined in
  `src/db/schema.ts` — run it after pulling schema changes.
- `npm run db:seed` / `npm run db:wipe` refuse to run when
  `NODE_ENV=production` (override with `ALLOW_SEED=1` / `ALLOW_WIPE=1`).
