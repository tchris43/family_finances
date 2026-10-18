import { desc, eq } from "drizzle-orm";
import { AppNav } from "@/components/app-nav";
import { SubmitButton } from "@/components/submit-button";
import { households, invites, users } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin";
import { revokeInvite } from "./actions";
import { NewInviteForm, ResetLinkButton } from "./admin-forms";

function day(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AdminPage() {
  const { db } = await requireAdminPage();

  const [inviteRows, accountRows] = await Promise.all([
    db
      .select({
        id: invites.id,
        note: invites.note,
        createdAt: invites.createdAt,
        redeemedAt: invites.redeemedAt,
        household: households.name,
      })
      .from(invites)
      .leftJoin(households, eq(invites.redeemedHouseholdId, households.id))
      .orderBy(desc(invites.createdAt)),
    db
      .select({
        userId: users.id,
        email: users.email,
        household: households.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(households, eq(users.householdId, households.id))
      .orderBy(desc(users.createdAt)),
  ]);

  const open = inviteRows.filter((i) => !i.redeemedAt);
  const used = inviteRows.filter((i) => i.redeemedAt);

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="font-serif text-3xl tracking-tight">Admin</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Invite friends and help them back in. This page only shows household
          names and login emails — never anyone&rsquo;s finances.
        </p>

        <section className="mt-10">
          <h2 className="font-serif text-xl">Invite a friend</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Each link works once. Send it however you like — they pick their
            own household name, email, and password.
          </p>
          <div className="mt-4">
            <NewInviteForm />
          </div>

          {open.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-[var(--muted)]">
                Unused invites ({open.length})
              </h3>
              <ul className="mt-2 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {open.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span>
                      {i.note || "Untitled invite"}{" "}
                      <span className="text-[var(--muted)]">
                        · {day(i.createdAt)}
                      </span>
                    </span>
                    <form action={revokeInvite}>
                      <input type="hidden" name="id" value={i.id} />
                      <SubmitButton
                        pendingLabel="Revoking…"
                        className="text-xs text-[var(--muted)] hover:text-red-700"
                      >
                        Revoke
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Lost the link? Revoke it and make a new one.
              </p>
            </div>
          ) : null}

          {used.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-[var(--muted)]">
                Used
              </h3>
              <ul className="mt-2 text-sm text-[var(--muted)]">
                {used.map((i) => (
                  <li key={i.id}>
                    {i.household ?? "(household removed)"}
                    {i.note ? ` · ${i.note}` : ""} ·{" "}
                    {day(i.redeemedAt as Date)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-xl">Forgot a password?</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Make a reset link and send it to them. It works once, for 24 hours,
            and replaces any earlier link for that login.
          </p>
          <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {accountRows.map((a) => (
              <li key={a.userId} className="space-y-1 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{a.household}</p>
                    <p className="truncate text-sm text-[var(--muted)]">
                      {a.email}
                    </p>
                  </div>
                  <ResetLinkButton userId={a.userId} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
