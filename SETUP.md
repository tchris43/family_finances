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
