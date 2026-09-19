import type { GymDetails, OtherDetails, PadelDetails, RunningDetails, Sport } from "@/lib/types";
import type { StravaActivity } from "./types";

/**
 * Strava sport_type → diary sport. Anything not listed becomes "other" with the
 * humanised sport type as the activity name. Activity names mentioning padel
 * win over the sport type, because Strava users often log padel as Workout or
 * Tennis.
 */
const SPORT_BY_TYPE: Record<string, Sport> = {
  Run: "running",
  TrailRun: "running",
  VirtualRun: "running",
  Padel: "padel",
  WeightTraining: "gym",
  Crossfit: "gym",
  HighIntensityIntervalTraining: "gym",
  Workout: "gym",
};

const PADEL_RE = /\bp[aá]del\b/i;

export function sportFor(a: Pick<StravaActivity, "sport_type" | "type" | "name">): Sport {
  if (PADEL_RE.test(a.name ?? "")) return "padel";
  return SPORT_BY_TYPE[a.sport_type ?? a.type ?? ""] ?? "other";
}

/** "EBikeRide" → "E bike ride", "WeightTraining" → "Weight training". */
export function humanizeSportType(t: string) {
  const words = t.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

function durationMin(a: StravaActivity, sport: Sport) {
  // Moving time is what runners care about; for everything else the session
  // length is the wall-clock time.
  const secs = sport === "running" ? a.moving_time || a.elapsed_time : a.elapsed_time || a.moving_time;
  if (!secs) return null;
  return Math.min(1440, Math.max(1, Math.round(secs / 60)));
}

function round(n: number | undefined | null, decimals = 0) {
  if (n === undefined || n === null || Number.isNaN(n)) return undefined;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Fields that come from the device/Strava and are safe to refresh on every update. */
export function activityMetrics(a: StravaActivity, sport: Sport) {
  return {
    performed_at: new Date(a.start_date).toISOString(),
    duration_min: durationMin(a, sport),
  };
}

function runningKind(a: StravaActivity): RunningDetails["kind"] {
  if (a.sport_type === "TrailRun") return "trail";
  switch (a.workout_type) {
    case 1: return "race";
    case 2: return "long";
    case 3: return "interval";
    default: return "easy";
  }
}

/** Sport-specific detail keys derived from Strava metrics (merged over existing details). */
export function activityDetailMetrics(a: StravaActivity, sport: Sport): Record<string, unknown> {
  const km = a.distance > 0 ? round(a.distance / 1000, 2) : undefined;
  if (sport === "running") {
    const d: Partial<RunningDetails> = {
      distance_km: km,
      avg_hr: round(a.average_heartrate),
      elevation_m: round(a.total_elevation_gain),
    };
    return stripUndefined(d);
  }
  if (sport === "other") {
    return stripUndefined({ distance_km: km } satisfies Partial<OtherDetails>);
  }
  return {};
}

/** Full details object for a freshly imported activity. */
export function activityDetails(a: StravaActivity, sport: Sport): Record<string, unknown> {
  const metrics = activityDetailMetrics(a, sport);
  switch (sport) {
    case "running":
      return { kind: runningKind(a), ...metrics } satisfies RunningDetails;
    case "padel":
      return { kind: "match", skills: [] } satisfies PadelDetails;
    case "gym":
      return { exercises: [] } satisfies GymDetails;
    default:
      return { activity: humanizeSportType(a.sport_type ?? a.type ?? "Activity"), ...metrics } satisfies OtherDetails;
  }
}

/** Everything needed to insert a new session row from a Strava activity. */
export function activityToSession(a: StravaActivity) {
  const sport = sportFor(a);
  const effort = a.perceived_exertion;
  return {
    sport,
    ...activityMetrics(a, sport),
    title: (a.name ?? "").trim().slice(0, 120) || null,
    notes: (a.description ?? "").trim().slice(0, 5000) || null,
    effort: typeof effort === "number" && effort >= 1 && effort <= 10 ? Math.round(effort) : null,
    rating: null,
    improvements: null,
    next_focus: null,
    details: activityDetails(a, sport),
    source: "strava" as const,
    strava_activity_id: a.id,
  };
}

function stripUndefined<T extends Record<string, unknown>>(o: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}
