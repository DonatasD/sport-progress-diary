import { cookies } from "next/headers";
import { DEFAULT_TZ, TZ_COOKIE, isValidTimeZone } from "./tz";

/**
 * The viewer's IANA timezone as reported by the browser via the `tz` cookie
 * (set by <TimezoneSync />). Falls back to UTC on the very first request.
 */
export async function getViewerTimeZone(): Promise<string> {
  const value = (await cookies()).get(TZ_COOKIE)?.value;
  return isValidTimeZone(value) ? value : DEFAULT_TZ;
}
