"use client";

import { useState, useTransition } from "react";
import { Download, Link2Off, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LocalTime } from "@/components/local-time";
import { Select } from "@/components/ui/select";
import { StravaMark } from "@/components/strava-mark";
import { IMPORT_RANGE_LABELS, IMPORT_RANGES, type ImportRange } from "@/lib/strava/import-ranges";
import type { StravaConnectionPublic } from "@/lib/strava/types";
import type { ImportSummary } from "@/lib/strava/sync";
import { cn } from "@/lib/utils";
import { disconnectStrava, importStravaHistory, setStravaAutoSync } from "@/app/(app)/settings/actions";

type Notice = { tone: "ok" | "error"; text: string } | null;

export function StravaCard({
  connection,
  configured,
  importedCount,
  notice,
  tz,
}: {
  connection: StravaConnectionPublic | null;
  configured: boolean;
  importedCount: number;
  notice: Notice;
  tz: string;
}) {
  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-base font-semibold">
            <StravaMark /> Strava
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Runs, padel matches and gym workouts you record on Strava show up here as sessions, ready for your notes.
          </p>
        </div>
      </div>

      {notice && <Message tone={notice.tone}>{notice.text}</Message>}

      {connection ? (
        <Connected connection={connection} importedCount={importedCount} tz={tz} />
      ) : (
        <Disconnected configured={configured} />
      )}
    </Card>
  );
}

function Disconnected({ configured }: { configured: boolean }) {
  return (
    <div className="space-y-3">
      {!configured && (
        <Message tone="error">
          Strava is not configured on the server yet. Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET (see README).
        </Message>
      )}
      <a
        href="/api/strava/connect"
        aria-disabled={!configured}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FC5200] px-6 text-base font-medium text-white active:scale-[0.98]",
          !configured && "pointer-events-none opacity-50",
        )}
      >
        Connect with Strava
      </a>
      <p className="text-xs text-muted-foreground">
        We ask for read-only access to your activities. Nothing is ever posted to Strava.
      </p>
    </div>
  );
}

function Connected({
  connection,
  importedCount,
  tz,
}: {
  connection: StravaConnectionPublic;
  importedCount: number;
  tz: string;
}) {
  const [autoSync, setAutoSync] = useState(connection.auto_sync);
  const [range, setRange] = useState<ImportRange>("6m");
  const [includeOther, setIncludeOther] = useState(true);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [importing, startImport] = useTransition();
  const [toggling, startToggle] = useTransition();
  const [disconnecting, startDisconnect] = useTransition();

  function runImport() {
    setError(null);
    setResult(null);
    startImport(async () => {
      const res = await importStravaHistory({ range, includeOther });
      if (res.ok) setResult(res.data);
      else setError(res.error);
    });
  }

  function toggleAutoSync(next: boolean) {
    setAutoSync(next);
    startToggle(async () => {
      const res = await setStravaAutoSync(next);
      if (!res.ok) {
        setAutoSync(!next);
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Athlete */}
      <div className="flex items-center gap-3">
        {connection.athlete_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={connection.athlete_avatar} alt="" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted" />
        )}
        <div className="min-w-0 leading-tight">
          <p className="truncate font-medium">{connection.athlete_name ?? `Athlete ${connection.athlete_id}`}</p>
          <p className="text-xs text-muted-foreground">
            Connected <LocalTime iso={connection.connected_at} tz={tz} />
            {connection.last_sync_at && (
              <>
                {" · "}Last sync <LocalTime iso={connection.last_sync_at} tz={tz} />
              </>
            )}
          </p>
        </div>
      </div>

      {connection.last_error && (
        <Message tone="error">Last sync failed: {connection.last_error}</Message>
      )}

      {/* Auto sync */}
      <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
        <span>
          <span className="block text-sm font-medium">Add new activities automatically</span>
          <span className="block text-xs text-muted-foreground">
            Via Strava webhooks, usually within a minute of you saving an activity.
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="h-6 w-6 shrink-0 accent-[#FC5200]"
          checked={autoSync}
          disabled={toggling}
          onChange={(e) => toggleAutoSync(e.target.checked)}
          aria-checked={autoSync}
        />
      </label>

      {/* History import */}
      <div className="space-y-3 rounded-xl border border-border p-3">
        <div>
          <p className="text-sm font-medium">Import past activities</p>
          <p className="text-xs text-muted-foreground">
            {importedCount > 0
              ? `${importedCount} session${importedCount === 1 ? "" : "s"} came from Strava so far. `
              : ""}
            Activities already in the diary are skipped, so it is safe to run again.
          </p>
        </div>
        <div>
          <Label htmlFor="strava_range">Range</Label>
          <Select id="strava_range" value={range} onChange={(e) => setRange(e.target.value as ImportRange)} disabled={importing}>
            {IMPORT_RANGES.map((r) => (
              <option key={r} value={r}>{IMPORT_RANGE_LABELS[r]}</option>
            ))}
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#FC5200]"
            checked={includeOther}
            disabled={importing}
            onChange={(e) => setIncludeOther(e.target.checked)}
          />
          Include activities that are not running, padel or gym (as “Other”)
        </label>
        <Button className="w-full" onClick={runImport} disabled={importing}>
          {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {importing ? "Importing…" : "Import from Strava"}
        </Button>
        {result && (
          <Message tone="ok">
            Imported {result.inserted} new session{result.inserted === 1 ? "" : "s"} out of {result.fetched} activit
            {result.fetched === 1 ? "y" : "ies"}
            {result.skipped > 0 ? ` (${result.skipped} already in the diary)` : ""}
            {result.ignored > 0 ? `, ${result.ignored} skipped as “Other”` : ""}.
            {result.truncated ? " Strava returned more than we import in one go: run again to continue." : ""}
          </Message>
        )}
      </div>

      {error && <Message tone="error">{error}</Message>}

      {/* Disconnect */}
      {!confirmDisconnect ? (
        <Button variant="ghost" className="w-full text-red-600 dark:text-red-400" onClick={() => setConfirmDisconnect(true)}>
          <Link2Off className="h-4 w-4" /> Disconnect Strava
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-center text-xs text-muted-foreground">
            Sessions already imported stay in the diary; they just stop syncing.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDisconnect(false)} disabled={disconnecting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={disconnecting}
              onClick={() =>
                startDisconnect(async () => {
                  const res = await disconnectStrava();
                  if (!res.ok) setError(res.error);
                })
              }
            >
              {disconnecting ? "Disconnecting…" : "Yes, disconnect"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Message({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl px-3 py-2 text-sm",
        tone === "ok"
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200",
      )}
    >
      {children}
    </p>
  );
}
