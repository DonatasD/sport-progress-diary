"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, List, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/sessions", label: "Sessions", icon: List },
  { href: "/stats", label: "Stats", icon: BarChart3 },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur pb-safe">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 pt-2">
        {items.slice(0, 2).map((item) => (
          <NavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}
        <Link
          href="/sessions/new"
          className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background active:scale-95"
          aria-label="Log a session"
        >
          <Plus className="h-6 w-6" />
        </Link>
        {items.slice(2).map((item) => (
          <NavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}
        <div className="w-14" aria-hidden />
      </div>
    </nav>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex w-16 flex-col items-center gap-0.5 rounded-lg py-1 text-[11px] font-medium",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
