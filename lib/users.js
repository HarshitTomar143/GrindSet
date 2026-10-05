import crypto from "crypto";
import { promisify } from "util";
import { query } from "./db";

/**
 * Accounts: one row per person, reachable by email + password, by Google, or
 * by both. The session itself is handled by next-auth (see lib/auth.js); this
 * file is only the table and the password arithmetic.
 */

const scrypt = promisify(crypto.scrypt);

// Create the table on first use (non-destructive; survives question reseeds).
let ensured;
export function ensureUsersTable() {
  if (!ensured) {
    ensured = query(`
      CREATE TABLE IF NOT EXISTS users (
        id             SERIAL PRIMARY KEY,
        name           TEXT NOT NULL,
        -- stored lower-cased, so the unique index is case-insensitive
        email          TEXT NOT NULL UNIQUE,
        -- NULL for an account that only signs in with Google
        password_hash  TEXT,
        google_sub     TEXT UNIQUE,
        image          TEXT,
        -- true once Google has vouched for the address; a password sign-up
        -- alone never proves the address is the person's own
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_login_at  TIMESTAMPTZ
      )
    `).catch((e) => {
      ensured = null; // let the next request retry instead of caching a failure
      throw e;
    });
  }
  return ensured;
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;
export const NAME_MAX = 80;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email) {
  return email.length <= 160 && EMAIL_RE.test(email);
}

// scrypt with a per-password salt. The parameters travel with the hash, so
// they can be raised later without invalidating existing passwords.
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const { N, r, p, keylen } = SCRYPT;
  const key = await scrypt(password, salt, keylen, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, N, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scrypt(password, Buffer.from(salt, "base64"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

// A fixed hash to compare against when the email is unknown, so "no such
// account" takes as long as "wrong password" and the two cannot be told apart.
let dummyHash;
async function burnTime(password) {
  dummyHash = dummyHash || (await hashPassword("not-a-real-password"));
  await verifyPassword(password, dummyHash);
}

const PUBLIC_COLS = "id, name, email, image, email_verified, created_at";

export async function findUserById(id) {
  await ensureUsersTable();
  const { rows } = await query(
    `SELECT ${PUBLIC_COLS}, password_hash IS NOT NULL AS has_password,
            google_sub IS NOT NULL AS has_google
       FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function findUserByGoogleSub(sub) {
  await ensureUsersTable();
  const { rows } = await query(`SELECT ${PUBLIC_COLS} FROM users WHERE google_sub = $1`, [sub]);
  return rows[0] || null;
}

/**
 * Create a password account. Returns { user } or { error } where error is
 * "exists" (a password account already uses the email) or "google" (the email
 * belongs to an account that signs in with Google).
 */
export async function createPasswordUser({ name, email, password }) {
  await ensureUsersTable();
  const password_hash = await hashPassword(password);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING ${PUBLIC_COLS}`,
    [name, email, password_hash]
  );
  if (rows[0]) return { user: rows[0] };
  const { rows: existing } = await query(
    "SELECT password_hash IS NOT NULL AS has_password FROM users WHERE email = $1",
    [email]
  );
  return { error: existing[0]?.has_password ? "exists" : "google" };
}

/** The account for an email + password, or null. Never says which was wrong. */
export async function checkPasswordLogin(email, password) {
  await ensureUsersTable();
  const { rows } = await query(
    `SELECT ${PUBLIC_COLS}, password_hash FROM users WHERE email = $1`,
    [email]
  );
  const user = rows[0];
  if (!user || !user.password_hash) {
    await burnTime(password);
    return null;
  }
  if (!(await verifyPassword(password, user.password_hash))) return null;
  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);
  const { password_hash, ...safe } = user;
  return safe;
}

/**
 * The account for a Google sign-in, created or linked as needed. Called only
 * for a Google profile whose email Google reports as verified.
 *
 * If a password account already uses that email and its address was never
 * verified, its password is cleared as Google is linked: whoever set that
 * password never proved they own the address, and the person signing in now
 * has. (Without this, someone could pre-register a stranger's email and keep
 * password access to the account the real owner later walks into.)
 */
export async function upsertGoogleUser({ sub, email, name, picture }) {
  await ensureUsersTable();
  const bySub = await query(
    `UPDATE users SET last_login_at = now(), image = COALESCE($2, image)
      WHERE google_sub = $1 RETURNING ${PUBLIC_COLS}`,
    [sub, picture || null]
  );
  if (bySub.rows[0]) return bySub.rows[0];

  const displayName = String(name || email.split("@")[0]).trim().slice(0, NAME_MAX);
  const { rows } = await query(
    `INSERT INTO users (name, email, google_sub, image, email_verified, last_login_at)
     VALUES ($1, $2, $3, $4, TRUE, now())
     ON CONFLICT (email) DO UPDATE
        SET google_sub = EXCLUDED.google_sub,
            image = COALESCE(EXCLUDED.image, users.image),
            password_hash = CASE WHEN users.email_verified THEN users.password_hash ELSE NULL END,
            email_verified = TRUE,
            last_login_at = now()
     RETURNING ${PUBLIC_COLS}`,
    [displayName, email, sub, picture || null]
  );
  return rows[0];
}
