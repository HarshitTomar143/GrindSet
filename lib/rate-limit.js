import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { query } from "./db";

/**
 * Request limits, counted in the database.
 *
 * The site runs as serverless functions, so a counter held in memory is seen
 * by one instance only and forgotten when it goes cold. One row per key in
 * `rate_limits` is shared by every instance instead.
 *
 * Each rule is a fixed window: `limit` hits per `windowS` seconds. A key is
 * "<rule>:<who>", where who is an IP address, an account id or an email.
 */

const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const LIMITS = {
  // Opening a mock paper. A candidate sits a few a day; a mobile carrier or a
  // coaching centre can put a whole class behind one address, so the anonymous
  // allowance is a wide one.
  paperIp: [
    { name: "paper-ip-10m", limit: 40, windowS: 10 * MIN },
    { name: "paper-ip-day", limit: 300, windowS: DAY },
  ],
  paperUser: [
    { name: "paper-user-10m", limit: 15, windowS: 10 * MIN },
    { name: "paper-user-day", limit: 80, windowS: DAY },
  ],
  submit: [{ name: "submit", limit: 30, windowS: 10 * MIN }],
  report: [{ name: "report", limit: 20, windowS: 10 * MIN }],
  adminLogin: [{ name: "admin-login", limit: 5, windowS: 10 * MIN }],
  signup: [{ name: "signup", limit: 8, windowS: 10 * MIN }],
  otpSend: [{ name: "otp", limit: 8, windowS: 10 * MIN }],
  // Password and code guesses against one account.
  login: [{ name: "login", limit: 8, windowS: 10 * MIN }],
};

let ensured;
function ensureRateTable() {
  if (!ensured) {
    ensured = query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key          TEXT PRIMARY KEY,
        count        INT NOT NULL DEFAULT 1,
        window_start TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `).catch((e) => {
      ensured = null;
      throw e;
    });
  }
  return ensured;
}

/**
 * The caller's address. Vercel writes x-real-ip / x-forwarded-for itself, so
 * neither can be forged from outside; behind another proxy, make sure it
 * overwrites these headers rather than appending to them.
 */
export function clientIp(request) {
  const h = request ? request.headers : headers();
  return (
    (h.get("x-real-ip") || "").trim() ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "local"
  );
}

// Counts the hit and reads the total in one statement, so parallel requests
// cannot slip past the limit.
async function hit(key, windowS) {
  const { rows } = await query(
    `INSERT INTO rate_limits AS r (key) VALUES ($1)
     ON CONFLICT (key) DO UPDATE
        SET count = CASE WHEN r.window_start > now() - make_interval(secs => $2)
                         THEN r.count + 1 ELSE 1 END,
            window_start = CASE WHEN r.window_start > now() - make_interval(secs => $2)
                                THEN r.window_start ELSE now() END
     RETURNING count,
               CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => $2) - now())))::int AS retry`,
    [key, windowS]
  );
  return rows[0];
}

/**
 * Counts one request by `who` against every rule in `rules`. Returns
 * { ok: true }, or { ok: false, retryAfter } with the seconds until the
 * longest exceeded window reopens.
 *
 * If the database cannot be reached the request is let through: a limiter
 * that is down should not take the site down with it.
 */
export async function rateLimit(rules, who) {
  try {
    await ensureRateTable();
    const results = await Promise.all(rules.map((r) => hit(`${r.name}:${who}`, r.windowS)));
    // Old rows are swept now and then rather than on a schedule.
    if (Math.random() < 0.01) {
      query("DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'").catch(() => {});
    }
    let retryAfter = 0;
    results.forEach((res, i) => {
      if (res.count > rules[i].limit) retryAfter = Math.max(retryAfter, res.retry, 1);
    });
    return retryAfter ? { ok: false, retryAfter } : { ok: true };
  } catch (e) {
    console.error("[rate-limit]", e.message);
    return { ok: true };
  }
}

/** The 429 an API route sends back for a failed rateLimit() result. */
export function tooManyResponse(result, error = "tooMany") {
  return NextResponse.json(
    { error },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
  );
}

/** Forgets the count for `who`, e.g. after a correct password. */
export async function clearRateLimit(rules, who) {
  try {
    await query("DELETE FROM rate_limits WHERE key = ANY($1)", [rules.map((r) => `${r.name}:${who}`)]);
  } catch {}
}

/**
 * The limit on opening mock papers, for a paper's server component. A
 * signed-in candidate is counted by account, anyone else by address.
 */
export async function paperRateLimit(account) {
  // A link prefetch carries no questions, so it does not use up the allowance.
  if (headers().get("next-router-prefetch")) return { ok: true };
  return account
    ? rateLimit(LIMITS.paperUser, `u${account.id}`)
    : rateLimit(LIMITS.paperIp, clientIp());
}
