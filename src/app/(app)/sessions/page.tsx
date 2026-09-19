import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { SessionCard } from "@/components/session-card";
import { getViewerTimeZone } from "@/lib/viewer-tz";
import { SPORT_META } from "@/lib/sports";
import { listSessions } from "@/lib/queries";
import { SPORTS, type Sport } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Sessions" };

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport: raw } = await searchParams;
  const sport = SPORTS.includes(raw as Sport) ? (raw as Sport) : undefined;
  const [sessions, tz] = await Promise.all([listSessions({ sport }), getViewerTimeZone()]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Sessions</h1>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <FilterChip href="/sessions" active={!sport}>All</FilterChip>
        {SPORTS.map((s) => (
          <FilterChip key={s} href={`/sessions?sport=${s}`} active={sport === s}>
            {SPORT_META[s].emoji} {SPORT_META[s].label}
          </FilterChip>
        ))}
      </div>

      {sessions.length === 0 ? (
        <EmptyState sport={sport} />
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => <SessionCard key={s.id} session={s} tz={tz} />)}
        </div>
      )}
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium",
        active ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card",
      )}
    >
      {children}
    </Link>
  );
}
