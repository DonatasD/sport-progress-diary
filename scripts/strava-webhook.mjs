#!/usr/bin/env node
/**
 * Manage the (single, app-wide) Strava webhook subscription.
 *
 *   node scripts/strava-webhook.mjs view
 *   node scripts/strava-webhook.mjs create https://sport-diary.donatasd.com
 *   node scripts/strava-webhook.mjs delete <subscription-id>
 *
 * Reads STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET and STRAVA_WEBHOOK_VERIFY_TOKEN
 * from the environment or from .env.local in the current directory. `create`
 * makes Strava call GET <origin>/api/strava/webhook, so the app must already be
 * deployed with the same verify token.
 */
import { readFileSync } from "node:fs";

loadDotEnv(".env.local");

const CLIENT_ID = required("STRAVA_CLIENT_ID");
const CLIENT_SECRET = required("STRAVA_CLIENT_SECRET");
const API = "https://www.strava.com/api/v3/push_subscriptions";

const [cmd, arg] = process.argv.slice(2);

switch (cmd) {
  case "view": {
    const res = await fetch(`${API}?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`);
    await print(res);
    break;
  }
  case "create": {
    if (!arg) fail("usage: create <https://your-app-origin>");
    const res = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        callback_url: `${arg.replace(/\/$/, "")}/api/strava/webhook`,
        verify_token: required("STRAVA_WEBHOOK_VERIFY_TOKEN"),
      }),
    });
    await print(res);
    break;
  }
  case "delete": {
    if (!arg) fail("usage: delete <subscription-id>");
    const res = await fetch(`${API}/${arg}`, {
      method: "DELETE",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
    });
    console.log(res.status === 204 ? "deleted" : `${res.status} ${await res.text()}`);
    break;
  }
  default:
    fail("usage: strava-webhook.mjs view | create <origin> | delete <id>");
}

async function print(res) {
  const text = await res.text();
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
  if (!res.ok) process.exit(1);
}

function required(name) {
  const v = process.env[name];
  if (!v) fail(`Missing ${name}`);
  return v;
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function loadDotEnv(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}
