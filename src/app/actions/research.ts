"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import type { ResearchNoteItem, ResearchSource } from "@/lib/types";

function toItem(row: {
  id: string;
  topic: string;
  summary: string;
  sources: unknown;
  queries: string[];
  createdAt: Date;
}): ResearchNoteItem {
  return {
    id: row.id,
    topic: row.topic,
    summary: row.summary,
    sources: row.sources as unknown as ResearchSource[],
    queries: row.queries,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// saveResearchNote
// ---------------------------------------------------------------------------

export async function saveResearchNote(data: {
  topic: string;
  summary: string;
  sources: ResearchSource[];
  queries: string[];
}): Promise<ResearchNoteItem> {
  const userId = await requireUserId();
  return _saveResearchNote(userId, data);
}

export async function saveResearchNoteInternal(
  userId: string,
  data: {
    topic: string;
    summary: string;
    sources: ResearchSource[];
    queries: string[];
  }
): Promise<ResearchNoteItem> {
  return _saveResearchNote(userId, data);
}

async function _saveResearchNote(
  userId: string,
  data: {
    topic: string;
    summary: string;
    sources: ResearchSource[];
    queries: string[];
  }
): Promise<ResearchNoteItem> {
  const row = await prisma.researchNote.create({
    data: {
      userId,
      topic: data.topic,
      summary: data.summary,
      sources: data.sources as object,
      queries: data.queries,
    },
  });

  return toItem(row);
}

// ---------------------------------------------------------------------------
// deleteResearchNote
// ---------------------------------------------------------------------------

export async function deleteResearchNote(id: string): Promise<void> {
  const userId = await requireUserId();
  const row = await prisma.researchNote.findUnique({ where: { id } });
  if (!row || row.userId !== userId) throw new Error("Not found");
  await prisma.researchNote.delete({ where: { id } });
}

export async function deleteResearchNoteInternal(userId: string, id: string): Promise<void> {
  const row = await prisma.researchNote.findUnique({ where: { id } });
  if (!row || row.userId !== userId) throw new Error("Not found");
  await prisma.researchNote.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// getRecentResearchNotes
// ---------------------------------------------------------------------------

export async function getRecentResearchNotes(limit = 3): Promise<ResearchNoteItem[]> {
  const userId = await requireUserId();
  return _getRecentResearchNotes(userId, limit);
}

export async function getRecentResearchNotesInternal(
  userId: string,
  limit = 3
): Promise<ResearchNoteItem[]> {
  return _getRecentResearchNotes(userId, limit);
}

async function _getRecentResearchNotes(userId: string, limit: number): Promise<ResearchNoteItem[]> {
  const rows = await prisma.researchNote.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map(toItem);
}

// ---------------------------------------------------------------------------
// getAllResearchNotes
// ---------------------------------------------------------------------------

export async function getAllResearchNotes(): Promise<ResearchNoteItem[]> {
  const userId = await requireUserId();
  return _getAllResearchNotes(userId);
}

export async function getAllResearchNotesInternal(userId: string): Promise<ResearchNoteItem[]> {
  return _getAllResearchNotes(userId);
}

async function _getAllResearchNotes(userId: string): Promise<ResearchNoteItem[]> {
  const rows = await prisma.researchNote.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(toItem);
}
