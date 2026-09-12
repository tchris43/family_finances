"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notes } from "@/db/schema";
import { requireSession } from "@/lib/session";

export async function createNote() {
  const { scoped } = await requireSession();

  const [note] = await scoped
    .insert(notes, { title: "Untitled", body: "" })
    .returning();

  revalidatePath("/notes");
  redirect(`/notes?id=${note.id}`);
}

export async function updateNote(formData: FormData) {
  const { scoped } = await requireSession();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim() || "Untitled";
  const body = String(formData.get("body") ?? "");

  if (!id) throw new Error("Note required");

  await scoped.updateById(
    notes,
    id,
    { title, body, updatedAt: new Date() },
    "Note",
  );

  revalidatePath("/notes");
}

export async function deleteNote(formData: FormData) {
  const { scoped } = await requireSession();
  const id = String(formData.get("id") ?? "");

  if (!id) throw new Error("Note required");

  await scoped.deleteById(notes, id, "Note");

  revalidatePath("/notes");
  redirect("/notes");
}
