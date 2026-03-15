/**
 * Calendar-date utilities for the UTC-midnight storage convention.
 *
 * xREBA stores calendar dates (slot dates, analytics, goals) as
 * `YYYY-MM-DDT00:00:00.000Z` — the UTC date component IS the local calendar day.
 * These are NOT real UTC timestamps; they are a representation convention.
 *
 * To extract the date string, always use `calendarDateStr()` — NEVER
 * `toLocaleDateString(locale, { timeZone })`, which would shift the date
 * for users west of UTC (e.g. 2026-03-15T00:00:00Z → "2026-03-14" in Vancouver).
 */

/** Extract "YYYY-MM-DD" from a UTC-midnight calendar date (storage convention). */
export function calendarDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}
