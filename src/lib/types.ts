import { z } from "zod";

export const SPORTS = ["padel", "running", "gym", "other"] as const;
export type Sport = (typeof SPORTS)[number];

// ---- Sport-specific detail schemas (stored in sessions.details jsonb) ----

export const padelDetailsSchema = z.object({
  kind: z.enum(["match", "training", "americano"]).default("match"),
  result: z.enum(["win", "loss", "draw"]).optional(),
  score: z.string().max(40).optional(),
  partner: z.string().max(80).optional(),
  opponents: z.string().max(120).optional(),
  skills: z.array(z.string().max(40)).max(20).default([]),
});
export type PadelDetails = z.infer<typeof padelDetailsSchema>;

export const PADEL_SKILLS = [
  "bandeja", "vibora", "smash", "lob", "volley", "chiquita",
  "serve", "return", "wall play", "positioning", "communication", "defence",
] as const;

export const runningDetailsSchema = z.object({
  kind: z.enum(["easy", "tempo", "interval", "long", "race", "trail"]).default("easy"),
  distance_km: z.number().positive().max(500).optional(),
  avg_hr: z.number().int().min(40).max(230).optional(),
  elevation_m: z.number().int().min(0).max(20000).optional(),
});
export type RunningDetails = z.infer<typeof runningDetailsSchema>;

export const gymSetSchema = z.object({
  reps: z.number().int().min(0).max(1000).optional(),
  weight_kg: z.number().min(0).max(1000).optional(),
});
export const gymExerciseSchema = z.object({
  name: z.string().min(1).max(80),
  sets: z.array(gymSetSchema).max(30).default([]),
});
export const gymDetailsSchema = z.object({
  focus: z.enum(["push", "pull", "legs", "upper", "lower", "full", "core", "mobility"]).optional(),
  exercises: z.array(gymExerciseSchema).max(40).default([]),
});
export type GymDetails = z.infer<typeof gymDetailsSchema>;
export type GymExercise = z.infer<typeof gymExerciseSchema>;

export const otherDetailsSchema = z.object({
  activity: z.string().max(80).optional(),
});
export type OtherDetails = z.infer<typeof otherDetailsSchema>;

export const detailsSchemaBySport = {
  padel: padelDetailsSchema,
  running: runningDetailsSchema,
  gym: gymDetailsSchema,
  other: otherDetailsSchema,
} as const;

// ---- Session ----

export const sessionInputSchema = z.object({
  sport: z.enum(SPORTS),
  performed_at: z.string().min(1), // ISO or datetime-local string
  duration_min: z.number().int().min(1).max(1440).nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  effort: z.number().int().min(1).max(10).nullable(),
  title: z.string().max(120).nullable(),
  notes: z.string().max(5000).nullable(),
  improvements: z.string().max(5000).nullable(),
  next_focus: z.string().max(5000).nullable(),
  details: z.record(z.string(), z.unknown()),
});
export type SessionInput = z.infer<typeof sessionInputSchema>;

export type SessionRow = {
  id: string;
  user_id: string;
  sport: Sport;
  performed_at: string;
  duration_min: number | null;
  rating: number | null;
  effort: number | null;
  title: string | null;
  notes: string | null;
  improvements: string | null;
  next_focus: string | null;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};
