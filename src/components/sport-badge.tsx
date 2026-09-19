import { SPORT_META } from "@/lib/sports";
import type { Sport } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SportBadge({ sport, className }: { sport: Sport; className?: string }) {
  const meta = SPORT_META[sport];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        meta.bg,
        meta.color,
        className,
      )}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
