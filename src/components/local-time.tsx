"use client";

import { useSyncExternalStore } from "react";
import { browserTimeZone, formatInZone, type TimeMode } from "@/lib/tz";

const subscribe = () => () => {};

/**
 * Renders an instant in the viewer's timezone.
 *
 * During server rendering and hydration it uses `tz` (the viewer's zone from
 * the cookie) so the markup matches; once hydrated it switches to the
 * browser's own zone, which is the source of truth.
 */
export function LocalTime({
  iso,
  tz,
  mode = "relative",
  className,
}: {
  iso: string;
  tz: string;
  mode?: TimeMode;
  className?: string;
}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const zone = hydrated ? browserTimeZone() : tz;
  return (
    <time dateTime={iso} className={className}>
      {formatInZone(new Date(iso), zone, mode)}
    </time>
  );
}
