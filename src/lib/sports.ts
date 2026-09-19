import type { Sport } from "./types";

export const SPORT_META: Record<
  Sport,
  { label: string; emoji: string; color: string; bg: string; ring: string; bar: string }
> = {
  padel: {
    label: "Padel",
    emoji: "🎾",
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-100 dark:bg-sky-950/60",
    ring: "ring-sky-500",
    bar: "bg-sky-400",
  },
  running: {
    label: "Running",
    emoji: "🏃",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-100 dark:bg-emerald-950/60",
    ring: "ring-emerald-500",
    bar: "bg-emerald-400",
  },
  gym: {
    label: "Gym",
    emoji: "🏋️",
    color: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-100 dark:bg-orange-950/60",
    ring: "ring-orange-500",
    bar: "bg-orange-400",
  },
  other: {
    label: "Other",
    emoji: "✨",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-100 dark:bg-violet-950/60",
    ring: "ring-violet-500",
    bar: "bg-violet-400",
  },
};
