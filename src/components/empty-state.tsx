import { Card } from "@/components/ui/card";
import { SPORT_META } from "@/lib/sports";
import type { Sport } from "@/lib/types";

export function EmptyState({ sport }: { sport?: Sport }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-3xl" aria-hidden>{sport ? SPORT_META[sport].emoji : "📓"}</p>
      <p className="mt-2 font-medium">No sessions yet</p>
      <p className="mt-1 text-sm text-muted-foreground">Tap + to log your first one.</p>
    </Card>
  );
}
