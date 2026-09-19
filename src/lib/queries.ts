import { createClient } from "@/lib/supabase/server";
import type { SessionRow, Sport } from "@/lib/types";

export async function listSessions(opts: { sport?: Sport; limit?: number; since?: Date } = {}) {
  const supabase = await createClient();
  let q = supabase.from("sessions").select("*").order("performed_at", { ascending: false });
  if (opts.sport) q = q.eq("sport", opts.sport);
  if (opts.since) q = q.gte("performed_at", opts.since.toISOString());
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as SessionRow[];
}

export async function getSession(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SessionRow | null) ?? null;
}
