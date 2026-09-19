"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { detailsSchemaBySport, sessionInputSchema, type SessionInput } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

function validate(input: SessionInput) {
  const parsed = sessionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" } as const;
  }
  const details = detailsSchemaBySport[parsed.data.sport].safeParse(parsed.data.details);
  if (!details.success) {
    return { error: details.error.issues[0]?.message ?? "Invalid sport details" } as const;
  }
  const performedAt = new Date(parsed.data.performed_at);
  if (Number.isNaN(performedAt.getTime())) return { error: "Invalid date" } as const;

  return {
    data: {
      ...parsed.data,
      performed_at: performedAt.toISOString(),
      title: parsed.data.title?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      improvements: parsed.data.improvements?.trim() || null,
      next_focus: parsed.data.next_focus?.trim() || null,
      details: details.data,
    },
  } as const;
}

export async function createSession(input: SessionInput): Promise<ActionResult> {
  const v = validate(input);
  if ("error" in v) return { ok: false, error: v.error ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data, error } = await supabase
    .from("sessions")
    .insert({ ...v.data, user_id: user.id })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath("/stats");
  redirect(`/sessions/${data.id}`);
}

export async function updateSession(id: string, input: SessionInput): Promise<ActionResult> {
  const v = validate(input);
  if ("error" in v) return { ok: false, error: v.error ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("sessions").update(v.data).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath(`/sessions/${id}`);
  revalidatePath("/stats");
  redirect(`/sessions/${id}`);
}

export async function deleteSession(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/sessions");
  revalidatePath("/stats");
  redirect("/sessions");
}
