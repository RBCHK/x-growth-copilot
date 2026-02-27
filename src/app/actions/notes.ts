"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getNotes(conversationId: string) {
  const rows = await prisma.note.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.createdAt,
  }));
}

export async function addNote(conversationId: string, content: string) {
  const note = await prisma.note.create({
    data: { conversationId, content },
  });
  revalidatePath(`/c/${conversationId}`);
  return { id: note.id, content: note.content, createdAt: note.createdAt };
}

export async function removeNote(id: string, conversationId: string) {
  await prisma.note.delete({ where: { id } });
  revalidatePath(`/c/${conversationId}`);
}

export async function clearNotes(conversationId: string) {
  await prisma.note.deleteMany({ where: { conversationId } });
  revalidatePath(`/c/${conversationId}`);
}
