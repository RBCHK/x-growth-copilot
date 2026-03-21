"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId, requireUser } from "@/lib/auth";
import type { GoalChartData, GoalTrackingData, SlotStatus, SlotType } from "@/lib/types";
import { SlotType as PrismaSlotType } from "@/generated/prisma";
import { calendarDateStr } from "@/lib/date-utils";

const slotStatusFromPrisma = (v: string): SlotStatus => v.toLowerCase() as SlotStatus;

const slotTypeFromPrisma = (v: PrismaSlotType): SlotType => {
  const map: Record<PrismaSlotType, SlotType> = {
    REPLY: "Reply",
    POST: "Post",
    THREAD: "Thread",
    ARTICLE: "Article",
    QUOTE: "Quote",
  };
  return map[v];
};

// Convert "HH:MM" (24h) → "h:MM AM/PM"
function time24to12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

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
  d.setUTCHours(h, m, 0, 0);
  return d;
}

// Add n UTC days to a date (never bare setDate — CLAUDE.md timezone rules)
function addUTCDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

// Lazy update: auto-transition FILLED slots past their scheduled time → POSTED
async function checkAndUpdatePassedSlots(userId: string) {
  const now = new Date();
  const filledSlots = await prisma.scheduledSlot.findMany({
    where: { status: "FILLED", userId },
  });

  const passedSlots = filledSlots.filter((s) => getSlotDateTime(s.date, s.timeSlot) < now);
  if (passedSlots.length === 0) return;

  const passedIds = passedSlots.map((s) => s.id);

  await prisma.scheduledSlot.updateMany({
    where: { id: { in: passedIds } },
    data: { status: "POSTED" },
  });

  const withConversation = passedSlots.filter((s) => s.conversationId);
  await Promise.all(
    withConversation.map((s) =>
      prisma.conversation.update({
        where: { id: s.conversationId! },
        data: { status: "POSTED" },
      })
    )
  );
}

// ─── Schedule types ───────────────────────────────────────

export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type SlotRow = {
  id: string;
  time: string; // "HH:MM" 24h
  days: Record<DayKey, boolean>;
};

export type ContentSchedule = { slots: SlotRow[] };

export type ScheduleConfig = {
  replies: ContentSchedule;
  posts: ContentSchedule;
  threads: ContentSchedule;
  articles: ContentSchedule;
  quotes: ContentSchedule;
};

// ─── Lookup tables ────────────────────────────────────────

const JS_TO_DAY: Record<number, DayKey> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

const SECTION_TO_SLOT_TYPE: Record<keyof ScheduleConfig, PrismaSlotType> = {
  replies: "REPLY",
  posts: "POST",
  threads: "THREAD",
  quotes: "QUOTE",
  articles: "ARTICLE",
};

const SLOT_TYPE_TO_SECTION: Record<PrismaSlotType, keyof ScheduleConfig> = {
  REPLY: "replies",
  POST: "posts",
  THREAD: "threads",
  QUOTE: "quotes",
  ARTICLE: "articles",
};

// ─── Config helpers ───────────────────────────────────────

/** Internal: get schedule config for a known userId (no auth call) */
async function getScheduleConfigInternal(userId: string): Promise<ScheduleConfig | null> {
  const row = await prisma.strategyConfig.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!row || !row.scheduleConfig) return null;
  return row.scheduleConfig as ScheduleConfig;
}

export { getScheduleConfigInternal };

export async function getScheduleConfig(): Promise<ScheduleConfig | null> {
  const userId = await requireUserId();
  return getScheduleConfigInternal(userId);
}

export async function saveScheduleConfig(data: ScheduleConfig): Promise<void> {
  const userId = await requireUserId();
  const existing = await prisma.strategyConfig.findFirst({ where: { userId } });
  const payload = { scheduleConfig: data as object };
  if (existing) {
    await prisma.strategyConfig.update({ where: { id: existing.id }, data: payload });
  } else {
    await prisma.strategyConfig.create({ data: { scheduleConfig: data as object, userId } });
  }
  revalidatePath("/");
}

// ─── Virtual slot computation ─────────────────────────────

type SlotItem = {
  id: string;
  date: Date;
  timeSlot: string;
  slotType: SlotType;
  status: SlotStatus;
  content?: string;
  draftId?: string;
  draftTitle?: string;
  postedAt?: Date;
};

/**
 * Computes virtual EMPTY slots from ScheduleConfig for a date range.
 * Slots already occupied (in occupiedKeys) are skipped.
 * occupiedKeys format: "${dateStr}_${timeSlot}_${prismaSlotType}"
 */
function computeVirtualSlots(
  config: ScheduleConfig,
  userId: string,
  fromDate: Date,
  days: number,
  timezone: string,
  occupiedKeys: Set<string>
): SlotItem[] {
  const result: SlotItem[] = [];

  for (let d = 0; d < days; d++) {
    const date = addUTCDays(fromDate, d);
    const dateStr = calendarDateStr(date);
    const dayKey = JS_TO_DAY[date.getUTCDay()];

    for (const [section, schedule] of Object.entries(config) as [
      keyof ScheduleConfig,
      ContentSchedule,
    ][]) {
      const prismaSlotType = SECTION_TO_SLOT_TYPE[section];

      for (const slotRow of schedule.slots) {
        if (!slotRow.time || !slotRow.days[dayKey]) continue;

        const timeSlot = time24to12(slotRow.time);

        // Always show today's slots (d === 0); skip past slots on future days
        if (d > 0 && !isSlotFuture(date, timeSlot, timezone)) continue;

        const conflictKey = `${dateStr}_${timeSlot}_${prismaSlotType}`;
        if (occupiedKeys.has(conflictKey)) continue;
        occupiedKeys.add(conflictKey); // prevent duplicate rows at same time

        result.push({
          id: `virtual_${userId}_${dateStr}_${slotRow.time}_${prismaSlotType}`,
          date,
          timeSlot,
          slotType: slotTypeFromPrisma(prismaSlotType),
          status: "empty",
        });
      }
    }
  }

  return result;
}

// ─── Public actions ───────────────────────────────────────

/**
 * Returns scheduled slots (FILLED + POSTED from DB) merged with virtual EMPTY slots
 * computed from ScheduleConfig. Default: 14 days from today in the user's timezone.
 */
export async function getScheduledSlots(options?: { from?: string; days?: number }) {
  const { id: userId, timezone } = await requireUser();
  await checkAndUpdatePassedSlots(userId);

  const days = options?.days ?? 14;
  const now = new Date();
  const fromDateStr = options?.from ?? now.toLocaleDateString("en-CA", { timeZone: timezone });
  const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);
  const toDate = addUTCDays(fromDate, days);

  // Fetch only real (FILLED + POSTED) rows
  const rows = await prisma.scheduledSlot.findMany({
    where: {
      userId,
      status: { in: ["FILLED", "POSTED"] },
      date: { gte: fromDate, lt: toDate },
    },
    include: { conversation: true },
  });

  const realSlots: SlotItem[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    timeSlot: r.timeSlot,
    slotType: slotTypeFromPrisma(r.slotType),
    status: slotStatusFromPrisma(r.status),
    content: r.content ?? undefined,
    draftId: r.conversationId ?? undefined,
    draftTitle: r.conversation?.title ?? undefined,
    postedAt: r.postedAt ?? undefined,
  }));

  // Build conflict set so virtual slots don't overlap real ones
  const occupiedKeys = new Set(
    rows.map((r) => `${calendarDateStr(r.date)}_${r.timeSlot}_${r.slotType}`)
  );

  const config = await getScheduleConfigInternal(userId);
  const virtualSlots = config
    ? computeVirtualSlots(config, userId, fromDate, days, timezone, occupiedKeys)
    : [];

  return [...realSlots, ...virtualSlots].sort(
    (a, b) =>
      getSlotDateTime(a.date, a.timeSlot).getTime() - getSlotDateTime(b.date, b.timeSlot).getTime()
  );
}

/** Returns true if the user has at least one future available slot of the given type */
export async function hasEmptySlots(slotType: PrismaSlotType): Promise<boolean> {
  const { id: userId, timezone } = await requireUser();
  const config = await getScheduleConfigInternal(userId);
  if (!config) return false;

  const schedule = config[SLOT_TYPE_TO_SECTION[slotType]];
  if (!schedule?.slots?.length) return false;

  const now = new Date();
  const localDateStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
  const todayUTC = new Date(`${localDateStr}T00:00:00.000Z`);
  const CHECK_DAYS = 14;
  const toDate = addUTCDays(todayUTC, CHECK_DAYS);

  const occupied = await prisma.scheduledSlot.findMany({
    where: { userId, status: "FILLED", slotType, date: { gte: todayUTC, lt: toDate } },
    select: { date: true, timeSlot: true },
  });
  const occupiedKeys = new Set(occupied.map((s) => `${calendarDateStr(s.date)}_${s.timeSlot}`));

  for (let d = 0; d < CHECK_DAYS; d++) {
    const date = addUTCDays(todayUTC, d);
    const dayKey = JS_TO_DAY[date.getUTCDay()];
    for (const slotRow of schedule.slots) {
      if (!slotRow.time || !slotRow.days[dayKey]) continue;
      const timeSlot = time24to12(slotRow.time);
      if (d > 0 && !isSlotFuture(date, timeSlot, timezone)) continue;
      if (!occupiedKeys.has(`${calendarDateStr(date)}_${timeSlot}`)) return true;
    }
  }
  return false;
}

export async function toggleSlotPosted(
  id: string
): Promise<{ postedAt?: Date; status: "POSTED" | "FILLED" | "EMPTY" }> {
  const userId = await requireUserId();
  const slot = await prisma.scheduledSlot.findFirst({ where: { id, userId } });
  if (!slot) throw new Error("Slot not found");

  if (slot.status === "POSTED") {
    if (slot.conversationId) {
      // Revert to FILLED — slot has content, keep the row
      await prisma.scheduledSlot.update({
        where: { id },
        data: { status: "FILLED", postedAt: null },
      });
      await prisma.conversation.update({
        where: { id: slot.conversationId },
        data: { status: "SCHEDULED" },
      });
      revalidatePath("/");
      return { status: "FILLED" };
    } else {
      // No content — delete row; slot reappears as virtual EMPTY on next fetch
      await prisma.scheduledSlot.delete({ where: { id } });
      revalidatePath("/");
      return { status: "EMPTY" };
    }
  } else {
    const postedAt = new Date();
    await prisma.scheduledSlot.update({ where: { id }, data: { status: "POSTED", postedAt } });
    if (slot.conversationId) {
      await prisma.conversation.update({
        where: { id: slot.conversationId },
        data: { status: "POSTED" },
      });
    }
    revalidatePath("/");
    return { postedAt, status: "POSTED" };
  }
}

export async function deleteSlot(id: string) {
  const userId = await requireUserId();
  const slot = await prisma.scheduledSlot.findFirst({ where: { id, userId } });
  if (!slot) return;
  if (slot.conversationId) {
    await prisma.conversation.update({
      where: { id: slot.conversationId },
      data: { status: "DRAFT" },
    });
  }
  await prisma.scheduledSlot.delete({ where: { id } });
  revalidatePath("/");
}

export async function unscheduleSlot(id: string) {
  const userId = await requireUserId();
  const slot = await prisma.scheduledSlot.findFirst({ where: { id, userId } });
  if (!slot) return;
  if (slot.conversationId) {
    await prisma.conversation.update({
      where: { id: slot.conversationId },
      data: { status: "DRAFT" },
    });
  }
  // Delete the row — slot reappears as virtual EMPTY on next fetch
  await prisma.scheduledSlot.delete({ where: { id } });
  revalidatePath("/");
}

/** Parse timeSlot string like "9:00 AM" → minutes since midnight */
function timeSlotToMinutes(timeSlot: string): number {
  const match = timeSlot.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

/** Returns true if a slot is in the future relative to the user's timezone. */
function isSlotFuture(slotDate: Date, timeSlot: string, timezone: string): boolean {
  const now = new Date();
  const slotLocalDate = calendarDateStr(slotDate);
  const nowLocalDate = now.toLocaleDateString("en-CA", { timeZone: timezone });

  if (slotLocalDate > nowLocalDate) return true;
  if (slotLocalDate < nowLocalDate) return false;

  const nowLocalTime = now.toLocaleString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return timeSlotToMinutes(timeSlot) > timeSlotToMinutes(nowLocalTime);
}

/**
 * Finds the next available slot of the given type from ScheduleConfig and creates
 * a FILLED row for it. Looks up to 60 days ahead.
 */
export async function addToQueue(
  content: string,
  conversationId?: string,
  slotType: PrismaSlotType = "POST"
) {
  const { id: userId, timezone } = await requireUser();
  const config = await getScheduleConfigInternal(userId);
  if (!config) return null;

  const schedule = config[SLOT_TYPE_TO_SECTION[slotType]];
  if (!schedule?.slots?.length) return null;

  const now = new Date();
  const localDateStr = now.toLocaleDateString("en-CA", { timeZone: timezone });
  const todayUTC = new Date(`${localDateStr}T00:00:00.000Z`);
  const LOOK_AHEAD_DAYS = 60;
  const toDate = addUTCDays(todayUTC, LOOK_AHEAD_DAYS);

  // Fetch existing FILLED + POSTED to avoid conflicts
  const occupied = await prisma.scheduledSlot.findMany({
    where: {
      userId,
      date: { gte: todayUTC, lt: toDate },
      status: { in: ["FILLED", "POSTED"] },
      slotType,
    },
    select: { date: true, timeSlot: true },
  });
  const occupiedKeys = new Set(occupied.map((s) => `${calendarDateStr(s.date)}_${s.timeSlot}`));

  // Sort slot rows by time for deterministic order
  const sortedRows = [...schedule.slots].sort((a, b) => {
    const [ah, am] = a.time.split(":").map(Number);
    const [bh, bm] = b.time.split(":").map(Number);
    return ah * 60 + am - (bh * 60 + bm);
  });

  for (let d = 0; d < LOOK_AHEAD_DAYS; d++) {
    const date = addUTCDays(todayUTC, d);
    const dayKey = JS_TO_DAY[date.getUTCDay()];
    const dateStr = calendarDateStr(date);

    for (const slotRow of sortedRows) {
      if (!slotRow.time || !slotRow.days[dayKey]) continue;
      const timeSlot = time24to12(slotRow.time);
      if (!isSlotFuture(date, timeSlot, timezone)) continue;

      if (occupiedKeys.has(`${dateStr}_${timeSlot}`)) continue;

      await prisma.scheduledSlot.create({
        data: {
          userId,
          date,
          timeSlot,
          slotType,
          status: "FILLED",
          content,
          conversationId: conversationId ?? null,
        },
      });

      if (conversationId) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: "SCHEDULED" },
        });
      }

      revalidatePath("/");
      return { date, timeSlot };
    }
  }

  return null;
}

// ─── Goal Config ──────────────────────────────────────────

export async function getGoalConfig(): Promise<{
  targetFollowers: number | null;
  targetDate: Date | null;
} | null> {
  const userId = await requireUserId();
  const row = await prisma.strategyConfig.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { targetFollowers: true, targetDate: true },
  });
  if (!row) return null;
  return { targetFollowers: row.targetFollowers, targetDate: row.targetDate };
}

export async function updateGoalConfig(data: {
  targetFollowers: number;
  targetDate: Date;
}): Promise<void> {
  const userId = await requireUserId();
  const existing = await prisma.strategyConfig.findFirst({ where: { userId } });
  if (existing) {
    await prisma.strategyConfig.update({
      where: { id: existing.id },
      data: { targetFollowers: data.targetFollowers, targetDate: data.targetDate },
    });
  } else {
    await prisma.strategyConfig.create({
      data: { targetFollowers: data.targetFollowers, targetDate: data.targetDate, userId },
    });
  }
  revalidatePath("/");
}

export async function getGoalTrackingData(): Promise<GoalTrackingData | null> {
  const userId = await requireUserId();
  return _getGoalTrackingData(userId);
}

export async function getGoalTrackingDataInternal(
  userId: string
): Promise<GoalTrackingData | null> {
  return _getGoalTrackingData(userId);
}

async function _getGoalTrackingData(userId: string): Promise<GoalTrackingData | null> {
  const config = await prisma.strategyConfig.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { targetFollowers: true, targetDate: true },
  });
  if (!config?.targetFollowers || !config?.targetDate) return null;

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 30);

  const snapshots = await prisma.followersSnapshot.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  if (snapshots.length === 0) return null;

  const latest = snapshots[snapshots.length - 1];
  const currentFollowers = latest.followersCount;

  const totalDelta = snapshots.reduce((sum, s) => sum + s.deltaFollowers, 0);
  const dailyAvgGrowth = snapshots.length > 1 ? totalDelta / snapshots.length : 0;

  const remaining = config.targetFollowers - currentFollowers;
  let projectedDate: Date | null = null;
  if (dailyAvgGrowth > 0) {
    const daysNeeded = Math.ceil(remaining / dailyAvgGrowth);
    projectedDate = new Date();
    projectedDate.setUTCDate(projectedDate.getUTCDate() + daysNeeded);
  }

  const targetDate = new Date(config.targetDate);
  const now = new Date();
  const daysToTarget = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const requiredDailyGrowth =
    daysToTarget > 0 ? remaining / daysToTarget : remaining > 0 ? Infinity : 0;
  const deviationDays = projectedDate
    ? Math.round((targetDate.getTime() - projectedDate.getTime()) / (1000 * 60 * 60 * 24))
    : -Infinity;

  const onTrack = dailyAvgGrowth >= requiredDailyGrowth;

  return {
    currentFollowers,
    targetFollowers: config.targetFollowers,
    targetDate: config.targetDate,
    dailyAvgGrowth: Math.round(dailyAvgGrowth * 10) / 10,
    projectedDate,
    deviationDays: deviationDays === -Infinity ? -999 : deviationDays,
    onTrack,
  };
}

export async function getGoalChartData(): Promise<GoalChartData | null> {
  const userId = await requireUserId();
  const config = await prisma.strategyConfig.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { targetFollowers: true, targetDate: true },
  });
  if (!config?.targetFollowers || !config?.targetDate) return null;

  const snapshots = await prisma.followersSnapshot.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    select: { date: true, followersCount: true },
  });
  if (snapshots.length === 0) return null;

  return {
    snapshots: snapshots.map((s) => ({
      date: s.date.toISOString().split("T")[0],
      followers: s.followersCount,
    })),
    targetFollowers: config.targetFollowers,
    targetDate: config.targetDate.toISOString().split("T")[0],
    firstFollowers: snapshots[0].followersCount,
    firstDate: snapshots[0].date.toISOString().split("T")[0],
  };
}
