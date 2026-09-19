import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SessionCard } from "@/components/session-card";
import { Card } from "@/components/ui/card";
import { SPORT_META } from "@/lib/sports";
import { listSessions } from "@/lib/queries";
import { SPORTS, type SessionRow } from "@/lib/types";
import { formatDuration } from "@/lib/utils";
import { startOfWeekIn } from "@/lib/tz";
import { getViewerTimeZone } from "@/lib/viewer-tz";

export default async function HomePage() {
  const [sessions, tz] = await Promise.all([listSessions({ limit: 200 }), getViewerTimeZone()]);
  const weekStart = startOfWeekIn(new Date(), tz);
  const thisWeek = sessions.filter((s) => new Date(s.performed_at) >= weekStart);
  const streak = weekStreak(sessions, tz);
  const minutes = thisWeek.reduce((a, s) => a + (s.duration_min ?? 0), 0);
  const lastFocus = sessions.find((s) => s.next_focus);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-3 gap-3">
        <Stat label="This week" value={String(thisWeek.length)} hint="sessions" />
        <Stat label="Time" value={formatDuration(minutes) ?? "0 min"} hint="this week" />
        <Stat
          label="Streak"
          value={String(streak)}
          hint={streak === 1 ? "week" : "weeks"}
          icon={streak > 0 ? <Flame className="h-4 w-4 text-orange-500" /> : undefined}
        />
      </section>

      <section className="grid grid-cols-4 gap-2">
        {SPORTS.map((sport) => {
          const count = thisWeek.filter((s) => s.sport === sport).length;
          const meta = SPORT_META[sport];
          return (
            <Link
              key={sport}
              href={`/sessions/new?sport=${sport}`}
              className={`flex flex-col items-center rounded-xl px-2 py-3 text-xs font-medium ${meta.bg} ${meta.color}`}
            >
              <span className="text-xl" aria-hidden>{meta.emoji}</span>
              <span>{meta.label}</span>
              <span className="opacity-70">{count} this wk</span>
            </Link>
          );
        })}
      </section>

      {lastFocus?.next_focus && (
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Focus from last {SPORT_META[lastFocus.sport].label.toLowerCase()}
          </p>
          <p className="mt-1 text-sm">{lastFocus.next_focus}</p>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent</h2>
          <Link href="/sessions" className="flex items-center gap-1 text-sm text-muted-foreground">
            All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {sessions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {sessions.slice(0, 8).map((s) => <SessionCard key={s.id} session={s} tz={tz} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint, icon }: { label: string; value: string; hint: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1 text-xl font-semibold tabular-nums">{value}{icon}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}

/** Consecutive weeks (ending this week or last week) with at least one session. */
function weekStreak(sessions: SessionRow[], tz: string) {
  const weeks = new Set(sessions.map((s) => startOfWeekIn(new Date(s.performed_at), tz).getTime()));
  let cursor = startOfWeekIn(new Date(), tz).getTime();
  const WEEK = 7 * 24 * 3600 * 1000;
  if (!weeks.has(cursor)) cursor -= WEEK; // this week not started yet still counts the streak
  let n = 0;
  while (weeks.has(cursor)) { n++; cursor -= WEEK; }
  return n;
}
