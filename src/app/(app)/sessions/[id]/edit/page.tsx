import { notFound } from "next/navigation";
import { SessionForm } from "@/components/session-form";
import { updateSession } from "@/app/(app)/sessions/actions";
import { getSession } from "@/lib/queries";
import type { SessionInput } from "@/lib/types";

export const metadata = { title: "Edit session" };

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  async function onSubmit(input: SessionInput) {
    "use server";
    return updateSession(id, input);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit session</h1>
      <SessionForm initial={session} onSubmit={onSubmit} submitLabel="Save changes" />
    </div>
  );
}
