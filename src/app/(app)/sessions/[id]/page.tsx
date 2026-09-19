import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { DeleteSessionButton } from "@/components/delete-session-button";
import { RatingStars } from "@/components/rating-stars";
import { SportBadge } from "@/components/sport-badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/queries";
import type { GymDetails, OtherDetails, PadelDetails, RunningDetails, SessionRow } from "@/lib/types";
import { formatDuration, formatPace } from "@/lib/utils";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <SportBadge sport={session.sport} />
          <h1 className="text-xl font-semibold leading-tight">
            {session.title ?? `${format(new Date(session.performed_at), "EEEE")} session`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(session.performed_at), "EEE d MMM yyyy · HH:mm")}
            {session.duration_min ? ` · ${formatDuration(session.duration_min)}` : ""}
          </p>
        </div>
        <Link href={`/sessions/${session.id}/edit`} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">How it went</p>
          <div className="mt-1">{session.rating ? <RatingStars value={session.rating} /> : <span className="text-sm">—</span>}</div>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Effort</p>
          <p className="mt-1 text-sm font-medium">{session.effort ? `${session.effort} / 10` : "—"}</p>
        </Card>
      </div>

      <SportDetails session={session} />

      <Block title="How was it" text={session.notes} />
      <Block title="What improved" text={session.improvements} accent="text-emerald-600 dark:text-emerald-400" />
      <Block title="Work on next" text={session.next_focus} accent="text-sky-600 dark:text-sky-400" />

      <div className="pt-4">
        <DeleteSessionButton id={session.id} />
      </div>
    </div>
  );
}

function Block({ title, text, accent }: { title: string; text: string | null; accent?: string }) {
  if (!text) return null;
  return (
    <Card className="p-4">
      <p className={`text-xs font-semibold uppercase tracking-wide ${accent ?? "text-muted-foreground"}`}>{title}</p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    </Card>
  );
}

function Row({ k, v, capitalize }: { k: string; v?: string | number | null; capitalize?: boolean }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={capitalize ? "text-right font-medium capitalize" : "text-right font-medium"}>{v}</span>
    </div>
  );
}

function SportDetails({ session }: { session: SessionRow }) {
  if (session.sport === "padel") {
    const d = session.details as PadelDetails;
    return (
      <Card className="space-y-2 p-4">
        <Row k="Type" v={d.kind} capitalize />
        <Row k="Result" v={d.result} capitalize />
        <Row k="Score" v={d.score} />
        <Row k="Partner" v={d.partner} />
        <Row k="Opponents" v={d.opponents} />
        {d.skills?.length ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {d.skills.map((s) => (
              <span key={s} className="rounded-full bg-muted px-2.5 py-0.5 text-xs capitalize">{s}</span>
            ))}
          </div>
        ) : null}
      </Card>
    );
  }
  if (session.sport === "running") {
    const d = session.details as RunningDetails;
    return (
      <Card className="space-y-2 p-4">
        <Row k="Type" v={d.kind} capitalize />
        <Row k="Distance" v={d.distance_km ? `${d.distance_km} km` : null} />
        <Row k="Pace" v={formatPace(d.distance_km, session.duration_min)} />
        <Row k="Avg HR" v={d.avg_hr ? `${d.avg_hr} bpm` : null} />
        <Row k="Elevation" v={d.elevation_m ? `${d.elevation_m} m` : null} />
      </Card>
    );
  }
  if (session.sport === "gym") {
    const d = session.details as GymDetails;
    const volume = d.exercises?.reduce(
      (a, e) => a + e.sets.reduce((b, s) => b + (s.reps ?? 0) * (s.weight_kg ?? 0), 0),
      0,
    );
    return (
      <Card className="space-y-3 p-4">
        <Row k="Focus" v={d.focus} capitalize />
        {volume ? <Row k="Volume" v={`${Math.round(volume).toLocaleString()} kg`} /> : null}
        {d.exercises?.map((e, i) => (
          <div key={i} className="border-t border-border pt-2 first:border-0">
            <p className="text-sm font-medium">{e.name || "Exercise"}</p>
            <p className="text-sm text-muted-foreground">
              {e.sets.map((s) => `${s.reps ?? "?"}×${s.weight_kg ?? 0}kg`).join(" · ")}
            </p>
          </div>
        ))}
      </Card>
    );
  }
  const d = session.details as OtherDetails;
  return d.activity ? <Card className="p-4"><Row k="Activity" v={d.activity} /></Card> : null;
}
