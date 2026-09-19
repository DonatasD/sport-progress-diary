import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({ value, className }: { value: number | null; className?: string }) {
  if (!value) return null;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}
