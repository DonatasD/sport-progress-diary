import { SessionForm } from "@/components/session-form";
import { createSession } from "@/app/(app)/sessions/actions";
import { SPORTS, type Sport } from "@/lib/types";

export const metadata = { title: "Log session" };

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport } = await searchParams;
  const defaultSport = SPORTS.includes(sport as Sport) ? (sport as Sport) : "padel";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Log a session</h1>
      <SessionForm defaultSport={defaultSport} onSubmit={createSession} submitLabel="Save session" />
    </div>
  );
}
