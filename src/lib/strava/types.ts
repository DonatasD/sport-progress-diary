/** Subset of Strava's SummaryActivity / DetailedActivity that we use. */
export type StravaActivity = {
  id: number;
  name: string;
  sport_type: string;
  type?: string;
  workout_type?: number | null; // Run: 0 default, 1 race, 2 long run, 3 workout
  start_date: string; // UTC ISO
  start_date_local?: string;
  timezone?: string;
  elapsed_time: number; // seconds
  moving_time: number; // seconds
  distance: number; // metres
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_speed?: number;
  suffer_score?: number | null;
  perceived_exertion?: number | null; // 1–10, detailed activity only
  description?: string | null; // detailed activity only
  trainer?: boolean;
  manual?: boolean;
  private?: boolean;
};

export type StravaAthlete = {
  id: number;
  firstname?: string;
  lastname?: string;
  profile?: string;
  profile_medium?: string;
};

export type StravaTokenResponse = {
  token_type: "Bearer";
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  expires_in: number;
  athlete?: StravaAthlete;
};

/** Row of public.strava_connections as read with the service role. */
export type StravaConnection = {
  user_id: string;
  athlete_id: number;
  athlete_name: string | null;
  athlete_avatar: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string | null;
  auto_sync: boolean;
  connected_at: string;
  last_sync_at: string | null;
  last_error: string | null;
};

/** What the UI is allowed to see (no tokens). */
export type StravaConnectionPublic = Omit<StravaConnection, "access_token" | "refresh_token">;

export type StravaWebhookEvent = {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates?: Record<string, string>;
};
