import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { AppNav } from "@/components/app-nav";
import { NoteEditor } from "@/components/note-editor";
import { notes } from "@/db/schema";
import { getAvailableToAssignCents } from "@/lib/ledger";
import { requireSession } from "@/lib/session";
import { createNote } from "./actions";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { householdId, db } = await requireSession();
  const { id } = await searchParams;
  const available = await getAvailableToAssignCents(db, householdId);

  const list = await db
    .select()
    .from(notes)
    .where(eq(notes.householdId, householdId))
    .orderBy(desc(notes.updatedAt));

  const selected =
    list.find((n) => n.id === id) ?? (list.length > 0 ? list[0] : null);

  return (
    <>
      <AppNav availableCents={available} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-serif text-3xl tracking-tight">Notes</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Scratch pad for goals, reminders, and whatever else.
        </p>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
          <aside className="w-full shrink-0 sm:w-56">
            <form action={createNote}>
              <button
                type="submit"
                className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
              >
                + New note
              </button>
            </form>
            <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {list.length === 0 ? (
                <li className="py-3 text-sm text-[var(--muted)]">
                  No notes yet.
                </li>
              ) : (
                list.map((note) => {
                  const active = selected?.id === note.id;
                  return (
                    <li key={note.id}>
                      <Link
                        href={`/notes?id=${note.id}`}
                        className={`block px-1 py-2.5 text-sm ${
                          active
                            ? "font-medium text-[var(--accent)]"
                            : "text-[var(--foreground)] hover:text-[var(--accent)]"
                        }`}
                      >
                        {note.title || "Untitled"}
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>

          <section className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-white/60 p-4 sm:p-5">
            {selected ? (
              <NoteEditor
                key={selected.id}
                note={{
                  id: selected.id,
                  title: selected.title,
                  body: selected.body,
                }}
              />
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Add a note to get started.
              </p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
