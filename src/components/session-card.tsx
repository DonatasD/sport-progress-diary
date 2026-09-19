import Link from "next/link";
import { format, isToday, isYesterday } from "date-fns";
import { SportBadge } from "@/components/sport-badge";
import { RatingStars } from "@/components/rating-stars";
import type { GymDetails, PadelDetails, RunningDetails, SessionRow } from "@/lib/types";
import { formatDuration, formatPace } from "@/lib/utils";

export function sessionSummary(s: SessionRow): string[] {
  const parts: string[] = [];
  const dur = formatDuration(s.duration_min);
  if (dur) parts.push(dur);

  if (s.sport === "padel") {
    const d = s.details as PadelDetails;
    if (d.kind) parts.push(d.kind);
    if (d.result) parts.push(d.result === "win" ? "W" : d.result === "loss" ? "L" : "D");
    if (d.score) parts.push(d.score);
  } else if (s.sport === "running") {
    const d = s.details as RunningDetails;
    if (d.distance_km) parts.push(`${d.distance_km} km`);
    const pace = formatPace(d.distance_km, s.duration_min);
    if (pace) parts.push(pace);
    if (d.kind) parts.push(d.kind);
  } else if (s.sport === "gym") {
    const d = s.details as GymDetails;
    if (d.focus) parts.push(d.focus);
    if (d.exercises?.length) parts.push(`${d.exercises.length} exercises`);
  }
  return parts;
}

export function formatWhen(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return `Today · ${format(d, "HH:mm")}`;
  if (isYesterday(d)) return `Yesterday · ${format(d, "HH:mm")}`;
  return format(d, "EEE d MMM · HH:mm");
}

export function SessionCard({ session }: { session: SessionRow }) {
  const summary = sessionSummary(session);
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="block rounded-2xl border border-border bg-card p-4 shadow-xs transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <SportBadge sport={session.sport} />
            <span className="text-xs text-muted-foreground">{formatWhen(session.performed_at)}</span>
          </div>
          {session.title && <p className="truncate font-medium">{session.title}</p>}
          {summary.length > 0 && (
            <p className="text-sm text-muted-foreground">{summary.join(" · ")}</p>
          )}
          {session.improvements && (
            <p className="line-clamp-2 text-sm">
              <span className="text-emerald-600 dark:text-emerald-400">↑ </span>
              {session.improvements}
            </p>
          )}
        </div>
        <RatingStars value={session.rating} className="shrink-0 pt-0.5" />
      </div>
    </Link>
  );
}
