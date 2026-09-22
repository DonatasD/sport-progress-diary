import { StravaCard } from "@/components/strava-card";
import { createClient, getUser } from "@/lib/supabase/server";
import { stravaConfigured } from "@/lib/strava/env";
import type { StravaConnectionPublic } from "@/lib/strava/types";
import { getViewerTimeZone } from "@/lib/viewer-tz";

export const metadata = { title: "Settings" };

const STRAVA_NOTICES: Record<string, { tone: "ok" | "error"; text: string }> = {
  connected: { tone: "ok", text: "Strava connected. New activities will appear here automatically." },
  denied: { tone: "error", text: "You declined the Strava authorisation." },
  missing_scope: { tone: "error", text: "Strava needs permission to read your activities. Please allow “View data about your activities”." },
  state_mismatch: { tone: "error", text: "The Strava sign-in expired or was tampered with. Please try again." },
  not_configured: { tone: "error", text: "Strava is not configured on the server (STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET)." },
  error: { tone: "error", text: "Connecting to Strava failed. Please try again." },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ strava?: string }>;
}) {
  const [{ strava: notice }, user, tz] = await Promise.all([searchParams, getUser(), getViewerTimeZone()]);

  let connection: StravaConnectionPublic | null = null;
  let stravaCount = 0;
  if (user) {
    const supabase = await createClient();
    const [conn, count] = await Promise.all([
      supabase
        .from("strava_connections")
        .select("user_id, athlete_id, athlete_name, athlete_avatar, scope, auto_sync, connected_at, last_sync_at, last_error, expires_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("source", "strava"),
    ]);
    connection = (conn.data as StravaConnectionPublic | null) ?? null;
    stravaCount = count.count ?? 0;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Settings</h1>

      <StravaCard
        connection={connection}
        configured={stravaConfigured()}
        importedCount={stravaCount}
        notice={notice ? STRAVA_NOTICES[notice] ?? null : null}
        tz={tz}
      />
    </div>
  );
}
