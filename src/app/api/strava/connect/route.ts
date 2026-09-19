import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { authorizeUrl, STATE_COOKIE } from "@/lib/strava/api";
import { stravaConfigured } from "@/lib/strava/env";

/** Starts the Strava OAuth flow for the signed-in user. */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);
  if (!stravaConfigured()) return NextResponse.redirect(`${origin}/settings?strava=not_configured`);

  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(authorizeUrl(`${origin}/api/strava/callback`, state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/api/strava",
    maxAge: 600,
  });
  return res;
}
