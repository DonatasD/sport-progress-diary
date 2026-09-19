import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import { AppHeader } from "@/components/app-header";
import { TimezoneSync } from "@/components/timezone-sync";
import { getViewerTimeZone } from "@/lib/viewer-tz";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, tz] = await Promise.all([getUser(), getViewerTimeZone()]);
  if (!user) redirect("/login");

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "";
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      <TimezoneSync current={tz} />
      <AppHeader name={name} avatar={avatar} />
      <main className="flex-1 px-4 pb-28 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}
