import { after, NextResponse, type NextRequest } from "next/server";
import { stravaWebhookVerifyToken } from "@/lib/strava/env";
import { handleWebhookEvent } from "@/lib/strava/sync";
import type { StravaWebhookEvent } from "@/lib/strava/types";

// Webhook processing fetches from Strava and writes to Supabase after the
// response has been sent; give it room on slow days.
export const maxDuration = 60;

/**
 * Subscription validation. Strava calls this once when the subscription is
 * created (see scripts/strava-webhook.mjs) and expects the challenge echoed back.
 */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  if (p.get("hub.mode") !== "subscribe" || p.get("hub.verify_token") !== stravaWebhookVerifyToken()) {
    return NextResponse.json({ error: "verification failed" }, { status: 403 });
  }
  return NextResponse.json({ "hub.challenge": p.get("hub.challenge") ?? "" });
}

/**
 * Activity / athlete events. Strava requires a 200 within two seconds and
 * retries otherwise, so the work happens in `after()` once the response is out.
 * Events are idempotent (keyed by activity id), so retries are harmless.
 */
export async function POST(request: NextRequest) {
  let event: StravaWebhookEvent;
  try {
    event = (await request.json()) as StravaWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!event || typeof event.object_id !== "number" || typeof event.owner_id !== "number") {
    return NextResponse.json({ error: "invalid event" }, { status: 400 });
  }

  after(() => handleWebhookEvent(event));
  return NextResponse.json({ ok: true });
}
