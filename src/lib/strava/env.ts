export function stravaClientId() {
  const v = process.env.STRAVA_CLIENT_ID;
  if (!v) throw new Error("Missing STRAVA_CLIENT_ID");
  return v;
}

export function stravaClientSecret() {
  const v = process.env.STRAVA_CLIENT_SECRET;
  if (!v) throw new Error("Missing STRAVA_CLIENT_SECRET");
  return v;
}

/** Shared secret Strava echoes back when validating the webhook subscription. */
export function stravaWebhookVerifyToken() {
  const v = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
  if (!v) throw new Error("Missing STRAVA_WEBHOOK_VERIFY_TOKEN");
  return v;
}

/** True when the Strava app credentials are configured (UI shows setup hints otherwise). */
export function stravaConfigured() {
  return Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}
