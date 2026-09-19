import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback. Supabase redirects here with ?code=... (PKCE) on success,
 * or ?error=...&error_description=... when sign-up was rejected
 * (for example by the allowlist trigger on auth.users).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description") ?? "";
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    const reason = /not_allowed|not on the allowlist|Database error saving new user/i.test(
      errorDescription,
    )
      ? "not_allowed"
      : "auth";
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const reason = /not_allowed|allowlist|Database error/i.test(error.message)
      ? "not_allowed"
      : "auth";
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
