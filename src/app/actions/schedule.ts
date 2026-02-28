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

// Combines a date (midnight) with a time slot string like "9:00 AM" → absolute Date
function getSlotDateTime(date: Date, timeSlot: string): Date {
  const d = new Date(date);
  const match = timeSlot.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return d;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  d.setHours(h, m, 0, 0);
  return d;
}

// Lazy update: auto-transition FILLED slots past their scheduled time → POSTED
async function checkAndUpdatePassedSlots() {
  const now = new Date();
  const filledSlots = await prisma.scheduledSlot.findMany({
    where: { status: "FILLED" },
  });
  for (const slot of filledSlots) {
    const slotDateTime = getSlotDateTime(slot.date, slot.timeSlot);
    if (slotDateTime < now) {
      await prisma.scheduledSlot.update({
        where: { id: slot.id },
        data: { status: "POSTED" },
      });
      if (slot.conversationId) {
        await prisma.conversation.update({
          where: { id: slot.conversationId },
          data: { status: "POSTED" },
        });
      }
    }
  }
}

// Ensure slots exist for a specific date (used when no free slots found)
async function ensureSlotsForDate(date: Date) {
  const config = await getStrategyConfig();
  const timeSlots = config?.timeSlots ?? ["9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM"];
  const postsPerDay = config?.postsPerDay ?? 2;

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
  // Lazy update: mark past FILLED slots as POSTED before returning
  await checkAndUpdatePassedSlots();

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

// Add selected text to the next available slot of matching type.
// Updates conversation status to SCHEDULED or POSTED depending on slot timing.
// If no free slot exists, generates slots for the next day and retries.
export async function addToQueue(
  content: string,
  conversationId?: string,
  slotType: "REPLY" | "POST" = "POST"
) {
  // Find first EMPTY slot of matching type
  let slot = await prisma.scheduledSlot.findFirst({
    where: { status: "EMPTY", slotType },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  });

  // No slot found → generate next-day slots and retry once
  if (!slot) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    await ensureSlotsForDate(tomorrow);
    slot = await prisma.scheduledSlot.findFirst({
      where: { status: "EMPTY", slotType },
      orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
    });
  }

  if (!slot) return null;

  // If slot time already passed → post immediately
  const now = new Date();
  const slotDateTime = getSlotDateTime(slot.date, slot.timeSlot);
  const isPast = slotDateTime < now;

  await prisma.scheduledSlot.update({
    where: { id: slot.id },
    data: {
      status: isPast ? "POSTED" : "FILLED",
      content,
      conversationId: conversationId ?? null,
    },
  });

  if (conversationId) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: isPast ? "POSTED" : "SCHEDULED" },
    });
  }

  revalidatePath("/");
  return { date: isPast ? now : slot.date, timeSlot: slot.timeSlot, isPast };
}
