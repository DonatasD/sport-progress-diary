import type { Metadata } from "next";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  not_allowed:
    "This Google account is not on the allowlist. Ask the owner to add your email.",
  auth: "Sign-in failed. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl">
            <span aria-hidden>🏅</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sports Diary</h1>
          <p className="text-sm text-muted-foreground">
            Padel, running and gym. What went well, what improved, what to work on next.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
          >
            {ERRORS[error] ?? ERRORS.auth}
          </p>
        )}

        <GoogleSignInButton next={next} />

        <p className="text-xs text-muted-foreground">Private app. Invite only.</p>
      </div>
    </main>
  );
}
