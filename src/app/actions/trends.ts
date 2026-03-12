"use server";

import { prisma } from "@/lib/prisma";
import type { TrendItem } from "@/lib/types";

/** Save a batch of trend snapshots for a given date */
export async function saveTrendSnapshots(
  date: Date,
  trends: (TrendItem & { trendingSince?: string })[]
): Promise<number> {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);

  const data = trends.map((t) => ({
    date: day,
    trendName: t.trendName,
    postCount: t.postCount,
    category: t.category ?? null,
    trendingSince: t.trendingSince ? new Date(t.trendingSince) : null,
  }));

  const result = await prisma.trendSnapshot.createMany({ data });
  return result.count;
}

/** Get trends for today (or the most recent available day) */
export async function getLatestTrends(): Promise<TrendItem[]> {
  // Find the most recent date that has trends
  const latest = await prisma.trendSnapshot.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });
  if (!latest) return [];

  const rows = await prisma.trendSnapshot.findMany({
    where: { date: latest.date },
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
