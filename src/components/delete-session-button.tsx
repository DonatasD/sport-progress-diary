"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteSession } from "@/app/(app)/sessions/actions";

export function DeleteSessionButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  if (!confirm) {
    return (
      <Button variant="ghost" className="w-full text-red-600 dark:text-red-400" onClick={() => setConfirm(true)}>
        <Trash2 className="h-4 w-4" /> Delete session
      </Button>
    );
  }
  return (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" onClick={() => setConfirm(false)} disabled={pending}>
        Cancel
      </Button>
      <Button variant="destructive" className="flex-1" disabled={pending} onClick={() => start(async () => { await deleteSession(id); })}>
        {pending ? "Deleting…" : "Yes, delete"}
      </Button>
    </div>
  );
}
