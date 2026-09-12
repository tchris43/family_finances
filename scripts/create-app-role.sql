-- Least-privilege database role for the running app.
--
-- The app never needs to change schema, drop tables, or TRUNCATE. Give it only
-- CRUD on the existing tables so a bug (or a compromised deploy) can't do
-- structural damage. Migrations (`npm run db:push`) keep using the owner role.
--
-- Run this once against the database, as the owner, replacing the password:
--   psql "$DATABASE_URL_OWNER" -f scripts/create-app-role.sql
-- Then point the app's DATABASE_URL at this role.

-- 1. The role. LOGIN + password only — no CREATEDB, no CREATEROLE, no BYPASSRLS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'family_finances_app') THEN
    CREATE ROLE family_finances_app LOGIN PASSWORD 'REPLACE_WITH_A_STRONG_PASSWORD';
  END IF;
END
$$;

-- 2. Can connect and see the schema, but not create objects in it.
GRANT CONNECT ON DATABASE CURRENT_CATALOG TO family_finances_app;
GRANT USAGE ON SCHEMA public TO family_finances_app;
REVOKE CREATE ON SCHEMA public FROM family_finances_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- 3. CRUD on every current table. No TRUNCATE, no REFERENCES, no DDL.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO family_finances_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO family_finances_app;

-- 4. Same grants for tables added by future migrations (created by the owner).
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO family_finances_app;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO family_finances_app;
