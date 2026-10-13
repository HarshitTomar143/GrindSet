import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * The "are you a person?" check (Cloudflare Turnstile) shown to a reader who
 * is opening papers faster than a candidate would - see `challengeAt` in
 * lib/rate-limit.js.
 *
 * Solving it sets a signed cookie that is good for PASS_MIN minutes from the
 * same address, so the reader is not asked again on every paper. The hard
 * limits still apply to someone holding a pass.
 *
 * Off unless TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are both set.
 */

export const HUMAN_COOKIE = "human_ok";
const PASS_MIN = 30;
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function captchaEnabled() {
  return Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

export function captchaSiteKey() {
  return process.env.TURNSTILE_SITE_KEY || "";
}

function sign(expires, ip) {
  return crypto
    .createHmac("sha256", process.env.TURNSTILE_SECRET_KEY || "")
    .update(`${expires}:${ip}`)
    .digest("hex");
}

/** True if the token the widget produced is genuine, according to Cloudflare. */
export async function verifyCaptcha(token, ip) {
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
      }),
    });
    return (await res.json()).success === true;
  } catch (e) {
    console.error("[captcha]", e.message);
    return false;
  }
}

/** The cookie that records a solved check: { name, value, options }. */
export function humanPass(ip) {
  const expires = Date.now() + PASS_MIN * 60 * 1000;
  return {
    name: HUMAN_COOKIE,
    value: `${expires}.${sign(expires, ip)}`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: PASS_MIN * 60,
    },
  };
}

/** True if this request carries an unexpired pass issued to the same address. */
export function hasHumanPass(ip) {
  const [expires, sig] = String(cookies().get(HUMAN_COOKIE)?.value || "").split(".");
  if (!sig || !(Number(expires) > Date.now())) return false;
  const expected = Buffer.from(sign(expires, ip), "hex");
  const given = Buffer.from(sig, "hex");
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
