/**
 * Timezone-aware date helpers. Isomorphic: no server-only imports.
 *
 * The server does not know the viewer's clock, so every calendar decision
 * (which day, which week, what time to show) is made in an explicit IANA
 * timezone. The viewer's zone reaches the server through the `tz` cookie
 * (see TimezoneSync) and reaches the client from the browser directly.
 */

export const TZ_COOKIE = "tz";
export const DEFAULT_TZ = "UTC";

const DAY_MS = 24 * 3600 * 1000;
const WD_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WD_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The browser's IANA timezone, or UTC when unavailable. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}

export type ZonedParts = {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Monday … 6 = Sunday
};

const partsCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(tz: string) {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    });
    partsCache.set(tz, f);
  }
  return f;
}

/** Wall-clock components of `date` in `tz`. */
export function zonedParts(date: Date, tz: string): ZonedParts {
  const map: Record<string, string> = {};
  for (const p of partsFormatter(tz).formatToParts(date)) map[p.type] = p.value;
  const sun0 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(map.weekday);
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: (sun0 + 6) % 7,
  };
}

/** The instant at which the calendar day (year, month, day) starts in `tz`. */
export function zonedMidnight(year: number, month: number, day: number, tz: string): Date {
  const target = Date.UTC(year, month - 1, day);
  let guess = target;
  // Two passes handle DST transitions on or near the target day.
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), tz);
    const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess -= wall - target;
  }
  return new Date(guess);
}

/** Monday 00:00 of the week containing `date`, in `tz`. */
export function startOfWeekIn(date: Date, tz: string): Date {
  const p = zonedParts(date, tz);
  const monday = new Date(Date.UTC(p.year, p.month - 1, p.day - p.weekday));
  return zonedMidnight(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate(), tz);
}

/** Start of the week `n` weeks before the one containing `date`. */
export function startOfWeekAgo(date: Date, n: number, tz: string): Date {
  return startOfWeekIn(new Date(date.getTime() - n * 7 * DAY_MS), tz);
}

/** "19/9" style label for chart axes. */
export function dayMonthLabel(date: Date, tz: string): string {
  const p = zonedParts(date, tz);
  return `${p.day}/${p.month}`;
}

export type TimeMode = "relative" | "full" | "weekday";

/**
 * Human-readable date/time in `tz`.
 * - relative: "Today · 18:24", "Yesterday · 09:10", "Sat 19 Sep · 18:24"
 * - full:     "Sat 19 Sep 2026 · 18:24"
 * - weekday:  "Saturday"
 */
export function formatInZone(date: Date, tz: string, mode: TimeMode, now: Date = new Date()): string {
  const p = zonedParts(date, tz);
  if (mode === "weekday") return WD_LONG[p.weekday];

  const hm = `${pad(p.hour)}:${pad(p.minute)}`;
  const dayLabel = `${WD_SHORT[p.weekday]} ${p.day} ${MON_SHORT[p.month - 1]}`;
  if (mode === "full") return `${dayLabel} ${p.year} · ${hm}`;

  const n = zonedParts(now, tz);
  const diffDays = Math.round((Date.UTC(n.year, n.month - 1, n.day) - Date.UTC(p.year, p.month - 1, p.day)) / DAY_MS);
  if (diffDays === 0) return `Today · ${hm}`;
  if (diffDays === 1) return `Yesterday · ${hm}`;
  return `${dayLabel} · ${hm}`;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
