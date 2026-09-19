import { LogOut } from "lucide-react";

export function AppHeader({ name, avatar }: { name: string; avatar?: string }) {
  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-2">
      <div className="flex items-center gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-9 w-9 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-muted" />
        )}
        <div className="leading-tight">
          <p className="text-xs text-muted-foreground">Sports Diary</p>
          <p className="text-sm font-medium">{name}</p>
        </div>
      </div>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </header>
  );
}
