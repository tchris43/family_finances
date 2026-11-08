@AGENTS.md

# Before calling any change "done"

Both must pass, and say so in the report:

- `npm test`: Vitest. The ledger tests run against PGlite, a real Postgres
  in-process, so they need no database URL and never touch Neon.
- `npm run typecheck`: `tsc --noEmit`.

A failing ledger test means the money math changed. Check
`specs/suspected-bugs.md` before "fixing" the test: some pinned behavior is
known-suspicious and is waiting on a decision, not a code change.
