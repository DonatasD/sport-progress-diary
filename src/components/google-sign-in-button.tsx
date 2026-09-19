"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (next) redirectTo.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setLoading(false);
      router.replace("/login?error=auth");
    }
  }

  return (
    <Button size="lg" className="w-full" onClick={signIn} disabled={loading}>
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.3 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z"/>
      </svg>
      {loading ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}
