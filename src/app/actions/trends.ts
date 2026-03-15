"use server";

import { prisma } from "@/lib/prisma";
import type { TrendItem } from "@/lib/types";

/** Save a batch of trend snapshots for a given date and fetch hour */
export async function saveTrendSnapshots(
  date: Date,
  trends: (TrendItem & { trendingSince?: string })[],
  fetchHour?: number
): Promise<number> {
  const day = new Date(date);
  const hour = fetchHour ?? day.getUTCHours();
  day.setUTCHours(0, 0, 0, 0);

  const data = trends.map((t) => ({
    date: day,
    fetchHour: hour,
    trendName: t.trendName,
    postCount: t.postCount,
    category: t.category ?? null,
    trendingSince: t.trendingSince ? new Date(t.trendingSince) : null,
  }));

  const result = await prisma.trendSnapshot.createMany({ data });
  return result.count;
}

/** Get trends from the most recent fetch (latest date + fetchHour) */
export async function getLatestTrends(): Promise<TrendItem[]> {
  // Find the most recent snapshot by date DESC, then fetchHour DESC
  const latest = await prisma.trendSnapshot.findFirst({
    orderBy: [{ date: "desc" }, { fetchHour: "desc" }],
    select: { date: true, fetchHour: true },
  });
  if (!latest) return [];

  const rows = await prisma.trendSnapshot.findMany({
    where: { date: latest.date, fetchHour: latest.fetchHour },
    orderBy: { postCount: "desc" },
  });

  return rows.map((r) => ({
    trendName: r.trendName,
    postCount: r.postCount,
    category: r.category ?? undefined,
  }));
}

/** Delete trend snapshots older than keepDays (default 10) */
export async function cleanupOldTrends(keepDays: number = 10): Promise<number> {
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - keepDays);

  const result = await prisma.trendSnapshot.deleteMany({
    where: { date: { lt: cutoff } },
  });
  return result.count;
}
