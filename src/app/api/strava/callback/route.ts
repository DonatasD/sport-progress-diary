import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";
import { exchangeCode, STATE_COOKIE } from "@/lib/strava/api";
import { saveConnection } from "@/lib/strava/sync";

/**
 * Strava redirects here with ?code=&scope=&state= after the athlete approves,
 * or ?error=access_denied when they decline.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const settings = (status: string) => {
    const res = NextResponse.redirect(`${origin}/settings?strava=${status}`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/strava" });
    return res;
  };

  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  if (searchParams.get("error")) return settings("denied");

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expected = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !expected || state !== expected) return settings("state_mismatch");

  const scope = searchParams.get("scope");
  if (!scope || !scope.split(",").some((s) => s === "activity:read_all" || s === "activity:read")) {
    return settings("missing_scope");
  }

  try {
    const token = await exchangeCode(code);
    await saveConnection(createAdminClient(), user.id, token, scope);
  } catch (e) {
    console.error("[strava] connect failed", e);
    return settings("error");
  }

  return settings("connected");
}
