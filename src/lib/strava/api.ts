import { stravaClientId, stravaClientSecret } from "./env";
import type { StravaActivity, StravaTokenResponse } from "./types";

const OAUTH_BASE = "https://www.strava.com/oauth";
const API_BASE = "https://www.strava.com/api/v3";

export const STRAVA_SCOPE = "read,activity:read_all";

/** Cookie holding the OAuth `state` nonce between /connect and /callback. */
export const STATE_COOKIE = "strava_oauth_state";

export class StravaError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "StravaError";
  }
}

export function authorizeUrl(redirectUri: string, state: string) {
  const u = new URL(`${OAUTH_BASE}/authorize`);
  u.searchParams.set("client_id", stravaClientId());
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("approval_prompt", "auto");
  u.searchParams.set("scope", STRAVA_SCOPE);
  u.searchParams.set("state", state);
  return u.toString();
}

async function tokenRequest(body: Record<string, string>): Promise<StravaTokenResponse> {
  const res = await fetch(`${OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: stravaClientId(),
      client_secret: stravaClientSecret(),
      ...body,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new StravaError(`Strava token request failed: ${res.status} ${await safeText(res)}`, res.status);
  }
  return (await res.json()) as StravaTokenResponse;
}

export function exchangeCode(code: string) {
  return tokenRequest({ code, grant_type: "authorization_code" });
}

export function refreshToken(refresh_token: string) {
  return tokenRequest({ refresh_token, grant_type: "refresh_token" });
}

export async function deauthorize(accessToken: string) {
  const res = await fetch(`${OAUTH_BASE}/deauthorize`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  // 401 means the token was already revoked on Strava's side: nothing to do.
  if (!res.ok && res.status !== 401) {
    throw new StravaError(`Strava deauthorize failed: ${res.status}`, res.status);
  }
}

async function apiGet<T>(accessToken: string, path: string, params?: Record<string, string>): Promise<T> {
  const u = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params ?? {})) u.searchParams.set(k, v);
  const res = await fetch(u, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new StravaError(`Strava API ${path} failed: ${res.status} ${await safeText(res)}`, res.status);
  }
  return (await res.json()) as T;
}

export function getActivity(accessToken: string, id: number) {
  return apiGet<StravaActivity>(accessToken, `/activities/${id}`);
}

export const ACTIVITIES_PER_PAGE = 200; // Strava maximum

export function listActivities(
  accessToken: string,
  opts: { after?: Date; before?: Date; page: number; perPage?: number },
) {
  const params: Record<string, string> = {
    page: String(opts.page),
    per_page: String(opts.perPage ?? ACTIVITIES_PER_PAGE),
  };
  if (opts.after) params.after = String(Math.floor(opts.after.getTime() / 1000));
  if (opts.before) params.before = String(Math.floor(opts.before.getTime() / 1000));
  return apiGet<StravaActivity[]>(accessToken, "/athlete/activities", params);
}

export function activityUrl(id: number | string) {
  return `https://www.strava.com/activities/${id}`;
}

async function safeText(res: Response) {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}
