"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { SlotStatus, SlotType } from "@/lib/types";
import { SlotStatus as PrismaSlotStatus, SlotType as PrismaSlotType } from "@/generated/prisma";

const slotStatusToPrisma: Record<SlotStatus, PrismaSlotStatus> = {
  empty: "EMPTY",
  filled: "FILLED",
  posted: "POSTED",
};

const slotTypeToPrisma: Record<SlotType, PrismaSlotType> = {
  Reply: "REPLY",
  Post: "POST",
};

const slotStatusFromPrisma = (v: PrismaSlotStatus): SlotStatus =>
  v.toLowerCase() as SlotStatus;

const slotTypeFromPrisma = (v: PrismaSlotType): SlotType =>
  v === "REPLY" ? "Reply" : "Post";

export async function getStrategyConfig() {
  const row = await prisma.strategyConfig.findFirst({ orderBy: { createdAt: "desc" } });
  if (!row) return null;
  const timeSlots = row.timeSlots as string[];
  return {
    id: row.id,
    postsPerDay: row.postsPerDay,
    replySessionsPerDay: row.replySessionsPerDay,
    timeSlots: Array.isArray(timeSlots) ? timeSlots : [],
  };
}

export async function upsertStrategyConfig(data: {
  postsPerDay: number;
  replySessionsPerDay: number;
  timeSlots: string[];
}) {
  const existing = await prisma.strategyConfig.findFirst();
  const payload = {
    postsPerDay: data.postsPerDay,
    replySessionsPerDay: data.replySessionsPerDay,
    timeSlots: data.timeSlots as object,
  };
  if (existing) {
    await prisma.strategyConfig.update({ where: { id: existing.id }, data: payload });
  } else {
    await prisma.strategyConfig.create({ data: payload });
  }
}

export async function getScheduledSlots() {
  const rows = await prisma.scheduledSlot.findMany({
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
    include: { conversation: true },
  });
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    timeSlot: r.timeSlot,
    slotType: slotTypeFromPrisma(r.slotType),
    status: slotStatusFromPrisma(r.status),
    content: r.content,
    draftId: r.conversationId ?? undefined,
    draftTitle: r.conversation?.title ?? undefined,
  }));
}

export async function ensureSlotsForWeek() {
  const config = await getStrategyConfig();
  const timeSlots = config?.timeSlots ?? ["9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM"];
  const postsPerDay = config?.postsPerDay ?? 2;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = 0; d < 7; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);

    for (let i = 0; i < timeSlots.length; i++) {
      const ts = timeSlots[i];
      const slotType: PrismaSlotType = i < postsPerDay ? "POST" : "REPLY";
      const dayStart = new Date(date);
      const dayEnd = new Date(date.getTime() + 86400000);
      const existing = await prisma.scheduledSlot.findFirst({
        where: {
          date: { gte: dayStart, lt: dayEnd },
          timeSlot: ts,
        },
      });
      if (!existing) {
        await prisma.scheduledSlot.create({
          data: { date, timeSlot: ts, slotType, status: "EMPTY" },
        });
      }
    }
  }
}

export async function addToQueue(content: string, conversationId?: string) {
  const slot = await prisma.scheduledSlot.findFirst({
    where: { status: "EMPTY" },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  });
  if (!slot) return null;
  await prisma.scheduledSlot.update({
    where: { id: slot.id },
    data: {
      status: "FILLED",
      content,
      conversationId: conversationId ?? null,
    },
  });
  revalidatePath("/");
  return { date: slot.date, timeSlot: slot.timeSlot };
}
