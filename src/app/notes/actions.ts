"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notes } from "@/db/schema";
import { requireSession } from "@/lib/session";

export async function createNote() {
  const { db, householdId } = await requireSession();

  const [note] = await db
    .insert(notes)
    .values({
      householdId,
      title: "Untitled",
      body: "",
    })
    .returning();

  revalidatePath("/notes");
  redirect(`/notes?id=${note.id}`);
}

export async function updateNote(formData: FormData) {
  const { db, householdId } = await requireSession();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim() || "Untitled";
  const body = String(formData.get("body") ?? "");

  if (!id) throw new Error("Note required");

  const [existing] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.householdId, householdId)))
    .limit(1);
  if (!existing) throw new Error("Note not found");

  await db
    .update(notes)
    .set({ title, body, updatedAt: new Date() })
    .where(eq(notes.id, id));

  revalidatePath("/notes");
}

export async function deleteNote(formData: FormData) {
  const { db, householdId } = await requireSession();
  const id = String(formData.get("id") ?? "");

  const [existing] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.householdId, householdId)))
    .limit(1);
  if (!existing) throw new Error("Note not found");

  await db.delete(notes).where(eq(notes.id, id));

  revalidatePath("/notes");
  redirect("/notes");
}
