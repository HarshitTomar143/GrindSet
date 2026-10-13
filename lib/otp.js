import crypto from "crypto";
import { query } from "./db";
import { normalizeEmail, isValidEmail } from "./users";

/**
 * One-time codes for signing in with a mobile number (sent by SMS) or an
 * email address (sent by email).
 *
 * One row per `target` - "phone:9876543210" or "email:a@b.in" - holding only
 * a keyed hash of the latest code. The row lives in the database rather than
 * in memory so a code issued by one server instance can be checked by another,
 * and it outlives the code itself so the limits on how often a target may be
 * sent a code still hold.
 */

const CODE_TTL_MIN = 5;
const RESEND_AFTER_S = 30;
const SENDS_PER_HOUR = 5;
// Wrong guesses allowed against one code: 5 in a million.
const TRIES_PER_CODE = 5;

export const OTP_LENGTH = 6;
export const OTP_TTL_MIN = CODE_TTL_MIN;

let ensured;
function ensureOtpTable() {
  if (!ensured) {
    ensured = query(`
      CREATE TABLE IF NOT EXISTS login_otps (
        target       TEXT PRIMARY KEY,
        code_hash    TEXT NOT NULL,
        expires_at   TIMESTAMPTZ NOT NULL,
        attempts     INT NOT NULL DEFAULT 0,
        sent_count   INT NOT NULL DEFAULT 1,
        window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `).catch((e) => {
      ensured = null;
      throw e;
    });
  }
  return ensured;
}

/**
 * An Indian mobile number as its ten digits, or null. Accepts the ways people
 * type one: "98765 43210", "+91-9876543210", "09876543210".
 */
export function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/**
 * Where a code is going, from what the form posted: { channel, to, target },
 * or null if the address is not valid. `channel` is "phone" or "email".
 */
export function otpTarget(channel, value) {
  if (channel === "phone") {
    const to = normalizePhone(value);
    return to && { channel, to, target: `phone:${to}` };
  }
  if (channel === "email") {
    const to = normalizeEmail(value);
    return isValidEmail(to) ? { channel, to, target: `email:${to}` } : null;
  }
  return null;
}

function hashCode(target, code) {
  return crypto
    .createHmac("sha256", process.env.NEXTAUTH_SECRET || "")
    .update(`${target}:${code}`)
    .digest("hex");
}

/**
 * A fresh code for this target, replacing any earlier one. Returns { code }, or
 * { error } of "wait" (asked again too soon) or "tooMany" (hourly limit).
 */
export async function issueOtp(target) {
  await ensureOtpTable();
  const { rows } = await query(
    `SELECT sent_count,
            last_sent_at > now() - make_interval(secs => $2) AS too_soon,
            window_start > now() - interval '1 hour' AS in_window
       FROM login_otps WHERE target = $1`,
    [target, RESEND_AFTER_S]
  );
  const row = rows[0];
  if (row?.too_soon) return { error: "wait" };
  if (row?.in_window && row.sent_count >= SENDS_PER_HOUR) return { error: "tooMany" };

  const code = String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
  await query(
    `INSERT INTO login_otps (target, code_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3))
     ON CONFLICT (target) DO UPDATE
        SET code_hash = EXCLUDED.code_hash,
            expires_at = EXCLUDED.expires_at,
            attempts = 0,
            last_sent_at = now(),
            sent_count = CASE WHEN login_otps.window_start > now() - interval '1 hour'
                              THEN login_otps.sent_count + 1 ELSE 1 END,
            window_start = CASE WHEN login_otps.window_start > now() - interval '1 hour'
                                THEN login_otps.window_start ELSE now() END`,
    [target, hashCode(target, code), CODE_TTL_MIN]
  );
  return { code };
}

/**
 * True if `code` is the live code for this target. A code works once, and
 * every check counts against it - the try is recorded before the comparison,
 * so parallel guesses cannot slip past the limit.
 */
export async function verifyOtp(target, code) {
  await ensureOtpTable();
  const { rows } = await query(
    `UPDATE login_otps SET attempts = attempts + 1
      WHERE target = $1 AND attempts < $2 AND expires_at > now()
      RETURNING code_hash`,
    [target, TRIES_PER_CODE]
  );
  if (!rows[0]) return false;
  const expected = Buffer.from(rows[0].code_hash, "hex");
  const given = Buffer.from(hashCode(target, code), "hex");
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false;
  await query("UPDATE login_otps SET expires_at = now() WHERE target = $1", [target]);
  return true;
}
