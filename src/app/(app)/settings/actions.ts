"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";
import { deauthorize } from "@/lib/strava/api";
import {
  deleteConnection,
  getConnectionByUser,
  importHistory,
  withFreshToken,
  type ImportSummary,
} from "@/lib/strava/sync";

import { IMPORT_RANGES, type ImportRange } from "@/lib/strava/import-ranges";

export type StravaActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function rangeStart(range: ImportRange): Date | undefined {
  if (range === "all") return undefined;
  const months = { "3m": 3, "6m": 6, "1y": 12, "2y": 24 }[range];
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath("/stats");
  revalidatePath("/settings");
}

/** Pull past Strava activities into the diary. Already-linked activities are left untouched. */
export async function importStravaHistory(input: {
  range: ImportRange;
  includeOther: boolean;
}): Promise<StravaActionResult<ImportSummary>> {
  if (!IMPORT_RANGES.includes(input.range)) return { ok: false, error: "Invalid range" };

  const user = await getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const admin = createAdminClient();
  const conn = await getConnectionByUser(admin, user.id);
  if (!conn) return { ok: false, error: "Strava is not connected" };

  try {
    const summary = await importHistory(admin, conn, {
      after: rangeStart(input.range),
      includeOther: input.includeOther,
    });
    revalidateAll();
    return { ok: true, data: summary };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed" };
  }
}

export async function setStravaAutoSync(enabled: boolean): Promise<StravaActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await createAdminClient()
    .from("strava_connections")
    .update({ auto_sync: enabled })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

/**
 * Revoke our access on Strava and forget the tokens. Imported sessions stay in
 * the diary; they simply stop receiving updates.
 */
export async function disconnectStrava(): Promise<StravaActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const admin = createAdminClient();
  const conn = await getConnectionByUser(admin, user.id);
  if (conn) {
    try {
      const fresh = await withFreshToken(admin, conn);
      await deauthorize(fresh.access_token);
    } catch (e) {
      // Token already dead or Strava unreachable: still remove our copy.
      console.warn("[strava] deauthorize failed, removing local connection anyway", e);
    }
    try {
      await deleteConnection(admin, user.id);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Could not disconnect" };
    }
  }

  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
