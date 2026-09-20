import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionRow } from "@/lib/types";
import { ACTIVITIES_PER_PAGE, getActivity, listActivities, refreshToken, StravaError } from "./api";
import { activityDetailMetrics, activityDetails, activityMetrics, activityToSession, sportFor } from "./map";
import type { StravaActivity, StravaConnection, StravaTokenResponse, StravaWebhookEvent } from "./types";

type Admin = ReturnType<typeof createAdminClient>;

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

export async function getConnectionByUser(admin: Admin, userId: string) {
  const { data, error } = await admin
    .from("strava_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StravaConnection | null) ?? null;
}

export async function getConnectionByAthlete(admin: Admin, athleteId: number) {
  const { data, error } = await admin
    .from("strava_connections")
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StravaConnection | null) ?? null;
}

/** Store the result of a code exchange for `userId`, replacing any previous connection. */
export async function saveConnection(admin: Admin, userId: string, token: StravaTokenResponse, scope: string | null) {
  const athlete = token.athlete;
  if (!athlete) throw new Error("Strava token response did not include the athlete");

  // The same Strava account may have been linked to another diary user before
  // (athlete_id is unique). Drop that link first: the newest authorisation wins.
  await admin.from("strava_connections").delete().eq("athlete_id", athlete.id).neq("user_id", userId);

  const { error } = await admin.from("strava_connections").upsert(
    {
      user_id: userId,
      athlete_id: athlete.id,
      athlete_name: [athlete.firstname, athlete.lastname].filter(Boolean).join(" ") || null,
      athlete_avatar: athlete.profile_medium ?? athlete.profile ?? null,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: new Date(token.expires_at * 1000).toISOString(),
      scope,
      connected_at: new Date().toISOString(),
      last_error: null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

export async function deleteConnection(admin: Admin, userId: string) {
  const { error } = await admin.from("strava_connections").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** Returns a connection whose access token is valid for at least a few minutes. */
export async function withFreshToken(admin: Admin, conn: StravaConnection): Promise<StravaConnection> {
  const expiresAt = new Date(conn.expires_at).getTime();
  if (expiresAt - Date.now() > 5 * 60 * 1000) return conn;

  const token = await refreshToken(conn.refresh_token);
  const next: StravaConnection = {
    ...conn,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: new Date(token.expires_at * 1000).toISOString(),
  };
  const { error } = await admin
    .from("strava_connections")
    .update({ access_token: next.access_token, refresh_token: next.refresh_token, expires_at: next.expires_at })
    .eq("user_id", conn.user_id);
  if (error) throw new Error(error.message);
  return next;
}

async function markSync(admin: Admin, userId: string, error: string | null) {
  await admin
    .from("strava_connections")
    .update({ last_sync_at: new Date().toISOString(), last_error: error })
    .eq("user_id", userId);
}

// ---------------------------------------------------------------------------
// Activities → sessions
// ---------------------------------------------------------------------------

async function findLinkedSession(admin: Admin, userId: string, activityId: number) {
  const { data, error } = await admin
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("strava_activity_id", activityId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SessionRow | null) ?? null;
}

export type UpsertOutcome = "inserted" | "updated" | "skipped";

/**
 * Create a session for `activity` if it is not linked yet. When it already
 * exists, refresh only the device-derived metrics (never the athlete's
 * reflections), plus title / sport when Strava reports those as changed.
 */
export async function upsertActivity(
  admin: Admin,
  conn: StravaConnection,
  activity: StravaActivity,
  opts: { updates?: Record<string, string>; refreshExisting?: boolean } = {},
): Promise<UpsertOutcome> {
  const existing = await findLinkedSession(admin, conn.user_id, activity.id);

  if (!existing) {
    const row = { ...activityToSession(activity), user_id: conn.user_id };
    const { error } = await admin.from("sessions").insert(row);
    if (error) {
      if (error.code === "23505") return "skipped"; // raced with another import
      throw new Error(error.message);
    }
    return "inserted";
  }

  if (!opts.refreshExisting) return "skipped";

  const updates = opts.updates ?? {};
  const typeChanged = "type" in updates || "sport_type" in updates;
  const sport = typeChanged ? sportFor(activity) : existing.sport;
  const sportChanged = sport !== existing.sport;

  const patch: Partial<SessionRow> = {
    ...activityMetrics(activity, sport),
    // A sport change invalidates the old details shape; otherwise keep what the
    // athlete entered and refresh only the device-derived numbers.
    details: sportChanged
      ? activityDetails(activity, sport)
      : { ...existing.details, ...activityDetailMetrics(activity, sport) },
  };
  if (sportChanged) patch.sport = sport;
  if ("title" in updates) patch.title = (activity.name ?? "").trim().slice(0, 120) || null;

  const { error } = await admin.from("sessions").update(patch).eq("id", existing.id).eq("user_id", conn.user_id);
  if (error) throw new Error(error.message);
  return "updated";
}

/**
 * Strava activity deleted: drop the session unless the athlete has written
 * anything about it, in which case keep the reflection and just unlink it.
 */
export async function removeActivity(admin: Admin, conn: StravaConnection, activityId: number) {
  const existing = await findLinkedSession(admin, conn.user_id, activityId);
  if (!existing) return "skipped" as const;

  const hasReflection = Boolean(existing.notes || existing.improvements || existing.next_focus || existing.rating);
  const q = admin.from("sessions");
  const { error } = hasReflection
    ? await q.update({ strava_activity_id: null }).eq("id", existing.id).eq("user_id", conn.user_id)
    : await q.delete().eq("id", existing.id).eq("user_id", conn.user_id);
  if (error) throw new Error(error.message);
  return hasReflection ? ("unlinked" as const) : ("deleted" as const);
}

/**
 * Bulk version of upsertActivity for history pages: one query to find which
 * activities are already linked, one insert for the rest. Existing sessions
 * are never modified here.
 */
async function insertNewActivities(admin: Admin, conn: StravaConnection, activities: StravaActivity[]) {
  if (activities.length === 0) return { inserted: 0, skipped: 0 };

  const ids = activities.map((a) => a.id);
  const { data: linked, error: linkedError } = await admin
    .from("sessions")
    .select("strava_activity_id")
    .eq("user_id", conn.user_id)
    .in("strava_activity_id", ids);
  if (linkedError) throw new Error(linkedError.message);
  const existing = new Set((linked ?? []).map((r) => Number(r.strava_activity_id)));

  const rows = activities
    .filter((a) => !existing.has(a.id))
    .map((a) => ({ ...activityToSession(a), user_id: conn.user_id }));
  if (rows.length === 0) return { inserted: 0, skipped: activities.length };

  const { error } = await admin.from("sessions").insert(rows);
  if (!error) return { inserted: rows.length, skipped: activities.length - rows.length };

  // 23505: a webhook inserted one of these while we were working. Fall back to
  // one-by-one so the rest of the page still lands.
  if (error.code !== "23505") throw new Error(error.message);
  let inserted = 0;
  for (const a of activities) {
    if (existing.has(a.id)) continue;
    if ((await upsertActivity(admin, conn, a)) === "inserted") inserted++;
  }
  return { inserted, skipped: activities.length - inserted };
}

// ---------------------------------------------------------------------------
// History import
// ---------------------------------------------------------------------------

export type ImportSummary = {
  fetched: number;
  inserted: number;
  skipped: number;
  ignored: number; // filtered out by includeOther=false
  pages: number;
  truncated: boolean;
};

const MAX_PAGES = 25; // 5 000 activities per run; well inside Strava's 15-minute read budget

export async function importHistory(
  admin: Admin,
  connIn: StravaConnection,
  opts: { after?: Date; before?: Date; includeOther?: boolean } = {},
): Promise<ImportSummary> {
  const summary: ImportSummary = { fetched: 0, inserted: 0, skipped: 0, ignored: 0, pages: 0, truncated: false };
  let conn = connIn;
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      conn = await withFreshToken(admin, conn);
      const batch = await listActivities(conn.access_token, { after: opts.after, before: opts.before, page });
      summary.pages = page;
      summary.fetched += batch.length;

      const wanted = batch.filter((a) => {
        if (opts.includeOther === false && sportFor(a) === "other") {
          summary.ignored++;
          return false;
        }
        return true;
      });
      const { inserted, skipped } = await insertNewActivities(admin, conn, wanted);
      summary.inserted += inserted;
      summary.skipped += skipped;

      if (batch.length < ACTIVITIES_PER_PAGE) break;
      if (page === MAX_PAGES) summary.truncated = true;
    }
    await markSync(admin, conn.user_id, null);
    return summary;
  } catch (e) {
    await markSync(admin, conn.user_id, errorMessage(e));
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export async function handleWebhookEvent(event: StravaWebhookEvent) {
  const admin = createAdminClient();

  // Athlete revoked access from strava.com → forget the connection.
  if (event.object_type === "athlete") {
    if (event.updates?.authorized === "false") {
      await admin.from("strava_connections").delete().eq("athlete_id", event.owner_id);
    }
    return;
  }

  if (event.object_type !== "activity") return;

  const conn = await getConnectionByAthlete(admin, event.owner_id);
  if (!conn || !conn.auto_sync) return;

  try {
    if (event.aspect_type === "delete") {
      await removeActivity(admin, conn, event.object_id);
    } else {
      const fresh = await withFreshToken(admin, conn);
      const activity = await getActivity(fresh.access_token, event.object_id);
      await upsertActivity(admin, fresh, activity, { updates: event.updates, refreshExisting: true });
    }
    await markSync(admin, conn.user_id, null);
  } catch (e) {
    // 404: activity was deleted/made private between the event and our fetch.
    if (e instanceof StravaError && e.status === 404) return;
    console.error("[strava] webhook processing failed", { event, error: errorMessage(e) });
    await markSync(admin, conn.user_id, errorMessage(e));
  }
}

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500);
}
