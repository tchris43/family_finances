"use client";

import { useState } from "react";
import { deleteNote, updateNote } from "@/app/notes/actions";

export function NoteEditor({
  note,
}: {
  note: { id: string; title: string; body: string };
}) {
  const [saved, setSaved] = useState(false);

  async function onSave(formData: FormData) {
    setSaved(false);
    await updateNote(formData);
    setSaved(true);
  }

  return (
    <div className="flex min-h-[20rem] flex-1 flex-col">
      <form action={onSave} className="flex flex-1 flex-col gap-3">
        <input type="hidden" name="id" value={note.id} />
        <input
          name="title"
          defaultValue={note.title}
          placeholder="Title"
          className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 font-serif text-xl"
        />
        <textarea
          name="body"
          defaultValue={note.body}
          placeholder="Write anything — goals, reminders, decisions…"
          rows={14}
          className="w-full flex-1 resize-y rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm leading-relaxed"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Save
          </button>
          {saved ? (
            <span className="text-sm text-teal-800">Saved</span>
          ) : null}
        </div>
      </form>
      <form action={deleteNote} className="mt-6">
        <input type="hidden" name="id" value={note.id} />
        <button
          type="submit"
          className="text-xs text-[var(--muted)] hover:text-red-700"
        >
          Delete note
        </button>
      </form>
    </div>
  );
}
