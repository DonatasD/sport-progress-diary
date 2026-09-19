import { cn } from "@/lib/utils";

/** Small orange square with the Strava "chevron" shape. */
export function StravaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("h-5 w-5", className)}>
      <rect width="24" height="24" rx="5" fill="#FC5200" />
      <path d="M10.9 4 6 13.7h2.9l2-3.9 2 3.9h2.9L10.9 4Zm4.9 9.7-1.4 2.8-1.4-2.8h-2.2L14.4 20 18 13.7h-2.2Z" fill="#fff" />
    </svg>
  );
}
