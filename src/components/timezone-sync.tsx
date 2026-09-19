"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TZ_COOKIE, browserTimeZone } from "@/lib/tz";

/**
 * Keeps the `tz` cookie equal to the browser's timezone so server components
 * can bucket sessions by the viewer's day and week. Re-renders the route once
 * when the cookie was missing or stale (first visit, travel, DST is irrelevant
 * since the zone name does not change).
 */
export function TimezoneSync({ current }: { current: string }) {
  const router = useRouter();

  useEffect(() => {
    const tz = browserTimeZone();
    if (tz === current) return;
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }, [current, router]);

  return null;
}
