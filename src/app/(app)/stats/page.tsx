import { subWeeks } from "date-fns";
import { Card } from "@/components/ui/card";
import { SPORT_META } from "@/lib/sports";
import { listSessions } from "@/lib/queries";
import { SPORTS, type GymDetails, type PadelDetails, type RunningDetails, type SessionRow } from "@/lib/types";
import { formatDuration, formatPace, startOfWeek } from "@/lib/utils";

export const metadata = { title: "Stats" };

const WEEKS = 8;

export default async function StatsPage() {
  const since = startOfWeek(subWeeks(new Date(), WEEKS - 1));
  const sessions = await listSessions({ since });

  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = startOfWeek(subWeeks(new Date(), WEEKS - 1 - i));
    const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
    const inWeek = sessions.filter((s) => {
      const t = new Date(s.performed_at).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
    return { start, bySport: Object.fromEntries(SPORTS.map((sp) => [sp, inWeek.filter((s) => s.sport === sp).length])) as Record<string, number>, total: inWeek.length };
  });
  const max = Math.max(1, ...weeks.map((w) => w.total));

  const padel = sessions.filter((s) => s.sport === "padel");
  const running = sessions.filter((s) => s.sport === "running");
  const gym = sessions.filter((s) => s.sport === "gym");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Last {WEEKS} weeks</h1>

      <Card className="p-4">
        <p className="mb-3 text-sm font-medium">Sessions per week</p>
        <div className="flex h-36 gap-2">
          {weeks.map((w) => (
            <div key={w.start.toISOString()} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-md" style={{ height: `${(w.total / max) * 100}%` }}>
                {SPORTS.map((sp) => w.bySport[sp] > 0 && (
                  <div key={sp} className={SPORT_META[sp].bar} style={{ flex: w.bySport[sp] }} title={`${SPORT_META[sp].label}: ${w.bySport[sp]}`} />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">{w.start.getDate()}/{w.start.getMonth() + 1}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {SPORTS.map((sp) => (
            <span key={sp} className="flex items-center gap-1">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${SPORT_META[sp].bar}`} />
              {SPORT_META[sp].label} · {sessions.filter((s) => s.sport === sp).length}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PadelStats sessions={padel} />
        <RunningStats sessions={running} />
        <GymStats sessions={gym} />
      </div>

      <Card className="p-4">
        <p className="text-sm font-medium">Total time</p>
        <p className="mt-1 text-2xl font-semibold">
          {formatDuration(sessions.reduce((a, s) => a + (s.duration_min ?? 0), 0)) ?? "0 min"}
        </p>
        <p className="text-xs text-muted-foreground">
          Avg rating {avg(sessions.map((s) => s.rating)) ?? "—"} · avg effort {avg(sessions.map((s) => s.effort)) ?? "—"}
        </p>
      </Card>
    </div>
  );
}

function avg(values: (number | null)[]) {
  const v = values.filter((x): x is number => x != null);
  if (!v.length) return null;
  return (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1);
}

function StatCard({ title, emoji, rows }: { title: string; emoji: string; rows: [string, string][] }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium"><span aria-hidden>{emoji}</span> {title}</p>
      <dl className="mt-2 space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function PadelStats({ sessions }: { sessions: SessionRow[] }) {
  const matches = sessions.filter((s) => (s.details as PadelDetails).kind !== "training");
  const wins = matches.filter((s) => (s.details as PadelDetails).result === "win").length;
  const losses = matches.filter((s) => (s.details as PadelDetails).result === "loss").length;
  const skills = new Map<string, number>();
  sessions.forEach((s) => ((s.details as PadelDetails).skills ?? []).forEach((k) => skills.set(k, (skills.get(k) ?? 0) + 1)));
  const top = [...skills.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join(", ");
  return (
    <StatCard title="Padel" emoji="🎾" rows={[
      ["Sessions", String(sessions.length)],
      ["Record", wins + losses ? `${wins}W – ${losses}L` : "—"],
      ["Most worked", top || "—"],
    ]} />
  );
}

function RunningStats({ sessions }: { sessions: SessionRow[] }) {
  const km = sessions.reduce((a, s) => a + ((s.details as RunningDetails).distance_km ?? 0), 0);
  const withBoth = sessions.filter((s) => (s.details as RunningDetails).distance_km && s.duration_min);
  const totalMin = withBoth.reduce((a, s) => a + (s.duration_min ?? 0), 0);
  const totalKm = withBoth.reduce((a, s) => a + ((s.details as RunningDetails).distance_km ?? 0), 0);
  return (
    <StatCard title="Running" emoji="🏃" rows={[
      ["Runs", String(sessions.length)],
      ["Distance", `${km.toFixed(1)} km`],
      ["Avg pace", formatPace(totalKm, totalMin) ?? "—"],
    ]} />
  );
}

function GymStats({ sessions }: { sessions: SessionRow[] }) {
  const volume = sessions.reduce((a, s) => a + ((s.details as GymDetails).exercises ?? []).reduce((b, e) => b + e.sets.reduce((c, st) => c + (st.reps ?? 0) * (st.weight_kg ?? 0), 0), 0), 0);
  const sets = sessions.reduce((a, s) => a + ((s.details as GymDetails).exercises ?? []).reduce((b, e) => b + e.sets.length, 0), 0);
  return (
    <StatCard title="Gym" emoji="🏋️" rows={[
      ["Workouts", String(sessions.length)],
      ["Sets", String(sets)],
      ["Volume", `${Math.round(volume).toLocaleString()} kg`],
    ]} />
  );
}
