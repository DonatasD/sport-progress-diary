"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SPORT_META } from "@/lib/sports";
import {
  PADEL_SKILLS,
  SPORTS,
  type GymExercise,
  type SessionInput,
  type SessionRow,
  type Sport,
} from "@/lib/types";
import { cn, formatPace, toLocalInputValue } from "@/lib/utils";
import type { ActionResult } from "@/app/(app)/sessions/actions";

type Props = {
  initial?: SessionRow;
  defaultSport?: Sport;
  onSubmit: (input: SessionInput) => Promise<ActionResult>;
  submitLabel: string;
};

type Details = Record<string, unknown>;

export function SessionForm({ initial, defaultSport = "padel", onSubmit, submitLabel }: Props) {
  const [sport, setSport] = useState<Sport>(initial?.sport ?? defaultSport);
  const [performedAt, setPerformedAt] = useState(
    toLocalInputValue(initial ? new Date(initial.performed_at) : new Date()),
  );
  const [duration, setDuration] = useState(initial?.duration_min?.toString() ?? "");
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [effort, setEffort] = useState<number | null>(initial?.effort ?? null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [improvements, setImprovements] = useState(initial?.improvements ?? "");
  const [nextFocus, setNextFocus] = useState(initial?.next_focus ?? "");
  const [details, setDetails] = useState<Details>(initial?.details ?? {});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function changeSport(s: Sport) {
    setSport(s);
    if (s !== initial?.sport) setDetails({});
    else setDetails(initial?.details ?? {});
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await onSubmit({
        sport,
        performed_at: new Date(performedAt).toISOString(),
        duration_min: duration ? Number(duration) : null,
        rating,
        effort,
        title: title || null,
        notes: notes || null,
        improvements: improvements || null,
        next_focus: nextFocus || null,
        details,
      });
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Sport picker */}
      <div className="grid grid-cols-4 gap-2">
        {SPORTS.map((s) => {
          const meta = SPORT_META[s];
          const active = s === sport;
          return (
            <button
              key={s}
              type="button"
              onClick={() => changeSport(s)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition",
                active
                  ? cn("border-transparent ring-2", meta.bg, meta.color, meta.ring)
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              <span className="text-xl" aria-hidden>{meta.emoji}</span>
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Basics */}
      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="performed_at">When</Label>
            <Input
              id="performed_at"
              type="datetime-local"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="duration">Duration (min)</Label>
            <Input
              id="duration"
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              placeholder="60"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="title">Title (optional)</Label>
          <Input
            id="title"
            placeholder={titlePlaceholder(sport)}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </div>
      </section>

      {/* Sport-specific */}
      <SportFields sport={sport} details={details} setDetails={setDetails} durationMin={duration ? Number(duration) : null} />

      {/* Feel */}
      <section className="space-y-4">
        <div>
          <Label>How did it go?</Label>
          <Segmented
            options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: ["😩", "😕", "🙂", "😃", "🔥"][n - 1] }))}
            value={rating}
            onChange={setRating}
          />
        </div>
        <div>
          <Label>Effort (RPE 1–10)</Label>
          <Segmented
            options={Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
            value={effort}
            onChange={setEffort}
            compact
          />
        </div>
      </section>

      {/* Reflection */}
      <section className="space-y-4">
        <div>
          <Label htmlFor="notes">How was the session?</Label>
          <Textarea
            id="notes"
            placeholder="What happened, how you felt, anything notable…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="improvements">What improved?</Label>
          <Textarea
            id="improvements"
            placeholder="Something that went better than last time…"
            value={improvements}
            onChange={(e) => setImprovements(e.target.value)}
            className="min-h-20"
          />
        </div>
        <div>
          <Label htmlFor="next_focus">Work on next time</Label>
          <Textarea
            id="next_focus"
            placeholder="One or two things to focus on…"
            value={nextFocus}
            onChange={(e) => setNextFocus(e.target.value)}
            className="min-h-20"
          />
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

function titlePlaceholder(sport: Sport) {
  switch (sport) {
    case "padel": return "Tuesday evening match";
    case "running": return "Easy 5k along the river";
    case "gym": return "Push day";
    default: return "Cycling, swim, hike…";
  }
}

// ---------------------------------------------------------------------------

function Segmented<T extends number>({
  options,
  value,
  onChange,
  compact,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-1.5", compact ? "grid-cols-10" : "grid-cols-5")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(value === o.value ? null : o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "flex h-11 items-center justify-center rounded-xl border text-base transition",
            compact && "text-sm",
            value === o.value
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            aria-pressed={on}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm capitalize transition",
              on ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SportFields({
  sport,
  details,
  setDetails,
  durationMin,
}: {
  sport: Sport;
  details: Details;
  setDetails: (d: Details) => void;
  durationMin: number | null;
}) {
  const set = (patch: Details) => setDetails({ ...details, ...patch });
  const num = (v: string) => (v === "" ? undefined : Number(v));
  const str = (k: string) => (details[k] as string | undefined) ?? "";

  if (sport === "padel") {
    const skills = (details.skills as string[] | undefined) ?? [];
    return (
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="p_kind">Type</Label>
            <Select id="p_kind" value={str("kind") || "match"} onChange={(e) => set({ kind: e.target.value })}>
              <option value="match">Match</option>
              <option value="training">Training</option>
              <option value="americano">Americano</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="p_result">Result</Label>
            <Select id="p_result" value={str("result")} onChange={(e) => set({ result: e.target.value || undefined })}>
              <option value="">—</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="draw">Draw</option>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="p_score">Score</Label>
          <Input id="p_score" placeholder="6-4 3-6 7-5" value={str("score")} onChange={(e) => set({ score: e.target.value || undefined })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="p_partner">Partner</Label>
            <Input id="p_partner" value={str("partner")} onChange={(e) => set({ partner: e.target.value || undefined })} />
          </div>
          <div>
            <Label htmlFor="p_opp">Opponents</Label>
            <Input id="p_opp" value={str("opponents")} onChange={(e) => set({ opponents: e.target.value || undefined })} />
          </div>
        </div>
        <div>
          <Label>Skills worked on</Label>
          <Chips
            options={PADEL_SKILLS}
            selected={skills}
            onToggle={(s) =>
              set({ skills: skills.includes(s) ? skills.filter((x) => x !== s) : [...skills, s] })
            }
          />
        </div>
      </section>
    );
  }

  if (sport === "running") {
    const distance = details.distance_km as number | undefined;
    const pace = formatPace(distance, durationMin);
    return (
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="r_kind">Type</Label>
            <Select id="r_kind" value={str("kind") || "easy"} onChange={(e) => set({ kind: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="tempo">Tempo</option>
              <option value="interval">Intervals</option>
              <option value="long">Long run</option>
              <option value="race">Race</option>
              <option value="trail">Trail</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="r_dist">Distance (km)</Label>
            <Input
              id="r_dist"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="5.0"
              value={distance ?? ""}
              onChange={(e) => set({ distance_km: num(e.target.value) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="r_hr">Avg heart rate</Label>
            <Input id="r_hr" type="number" inputMode="numeric" placeholder="150" value={(details.avg_hr as number | undefined) ?? ""} onChange={(e) => set({ avg_hr: num(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor="r_elev">Elevation (m)</Label>
            <Input id="r_elev" type="number" inputMode="numeric" placeholder="0" value={(details.elevation_m as number | undefined) ?? ""} onChange={(e) => set({ elevation_m: num(e.target.value) })} />
          </div>
        </div>
        {pace && <p className="text-sm text-muted-foreground">Pace: <span className="font-medium text-foreground">{pace}</span></p>}
      </section>
    );
  }

  if (sport === "gym") {
    const exercises = (details.exercises as GymExercise[] | undefined) ?? [];
    const update = (list: GymExercise[]) => set({ exercises: list });
    return (
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <div>
          <Label htmlFor="g_focus">Focus</Label>
          <Select id="g_focus" value={str("focus")} onChange={(e) => set({ focus: e.target.value || undefined })}>
            <option value="">—</option>
            {["push", "pull", "legs", "upper", "lower", "full", "core", "mobility"].map((f) => (
              <option key={f} value={f} className="capitalize">{f[0].toUpperCase() + f.slice(1)}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Exercises</Label>
          {exercises.map((ex, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Bench press"
                  value={ex.name}
                  onChange={(e) => update(exercises.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                />
                <Button variant="ghost" size="icon" aria-label="Remove exercise" onClick={() => update(exercises.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1.5">
                {ex.sets.map((s, k) => (
                  <div key={k} className="grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{k + 1}</span>
                    <Input
                      type="number" inputMode="numeric" placeholder="reps" className="h-10"
                      value={s.reps ?? ""}
                      onChange={(e) => update(exercises.map((x, j) => j === i ? { ...x, sets: x.sets.map((y, l) => l === k ? { ...y, reps: num(e.target.value) } : y) } : x))}
                    />
                    <Input
                      type="number" inputMode="decimal" step="0.5" placeholder="kg" className="h-10"
                      value={s.weight_kg ?? ""}
                      onChange={(e) => update(exercises.map((x, j) => j === i ? { ...x, sets: x.sets.map((y, l) => l === k ? { ...y, weight_kg: num(e.target.value) } : y) } : x))}
                    />
                    <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Remove set" onClick={() => update(exercises.map((x, j) => j === i ? { ...x, sets: x.sets.filter((_, l) => l !== k) } : x))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline" size="sm"
                  onClick={() => {
                    const last = ex.sets[ex.sets.length - 1];
                    update(exercises.map((x, j) => j === i ? { ...x, sets: [...x.sets, { reps: last?.reps, weight_kg: last?.weight_kg }] } : x));
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Add set
                </Button>
              </div>
            </div>
          ))}
          <Button variant="secondary" className="w-full" onClick={() => update([...exercises, { name: "", sets: [{}] }])}>
            <Plus className="h-4 w-4" /> Add exercise
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <Label htmlFor="o_activity">Activity</Label>
      <Input id="o_activity" placeholder="Cycling, swimming, hiking…" value={str("activity")} onChange={(e) => set({ activity: e.target.value || undefined })} />
    </section>
  );
}
