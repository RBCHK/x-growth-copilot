"use client";

import { useEffect } from "react";
import { syncTimezone } from "@/app/actions/user";

/**
 * Detects the browser's IANA timezone and syncs it to the DB once per session.
 * Renders nothing — side-effect only.
 */
export function TimezoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    syncTimezone(tz).catch(() => {
      // Non-critical — silently ignore
    });
  }, []);

  return null;
}
