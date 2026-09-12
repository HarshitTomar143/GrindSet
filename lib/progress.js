/**
 * Browser-local practice history and in-progress attempts.
 *
 * Everything here lives in localStorage only. Finished results still go to the
 * server (see /api/submit) — this is the candidate's own copy, so the chooser
 * can offer "carry on where you stopped" and a refresh mid-paper does not
 * throw away an hour of work.
 *
 * Every function is safe to call when storage is unavailable (private windows,
 * blocked site data) and returns an empty result instead of throwing.
 */

const HISTORY_KEY = "octopus.history.v1";
const ATTEMPT_PREFIX = "octopus.attempt.v1:";
const HISTORY_MAX = 24;

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

// ---------------------------------------------------------------- history ---

/** Finished papers, newest first. */
export function readHistory() {
  const list = read(HISTORY_KEY, []);
  return Array.isArray(list) ? list : [];
}

/**
 * Record a finished paper. One entry per paper: re-attempting the same mock
 * replaces the old entry so the list stays a set of papers, not of sittings.
 */
export function recordResult(entry) {
  if (!entry?.href) return;
  const rest = readHistory().filter((e) => e.href !== entry.href);
  write(HISTORY_KEY, [{ ...entry, at: Date.now() }, ...rest].slice(0, HISTORY_MAX));
}

/**
 * How a scored paper reads at a glance: "pass" or "fail" against the exam's
 * qualifying mark, or "neutral" for an exam that publishes none (UP TGT/PGT).
 * Entries saved before the mark was recorded fall back to the TET 60%.
 */
export function resultTone(entry) {
  if (!entry || entry.passMark === null) return "neutral";
  return entry.pct >= (entry.passMark ?? 60) ? "pass" : "fail";
}

/** What the reader has already scored, keyed by paper href. */
export function historyByHref() {
  const map = {};
  for (const e of readHistory()) if (e.href && !map[e.href]) map[e.href] = e;
  return map;
}

export function clearHistory() {
  remove(HISTORY_KEY);
}

// -------------------------------------------------------- live attempt ---

export function attemptKey(href) {
  return ATTEMPT_PREFIX + href;
}

/**
 * Save the state of a paper being written. Called on every answer, so it keeps
 * only what cannot be recomputed: the answers, where the reader is, and the
 * clock.
 */
export function saveAttempt(href, state) {
  if (!href) return;
  write(attemptKey(href), { ...state, at: Date.now() });
}

/**
 * An unfinished attempt at this paper, or null. Attempts older than a day are
 * dropped: coming back to a half-written paper the next morning and finding a
 * running clock is worse than starting clean.
 */
export function readAttempt(href) {
  const saved = read(attemptKey(href), null);
  if (!saved || typeof saved !== "object") return null;
  if (!saved.at || Date.now() - saved.at > 24 * 60 * 60 * 1000) {
    remove(attemptKey(href));
    return null;
  }
  return saved;
}

export function clearAttempt(href) {
  remove(attemptKey(href));
}

/** Every unfinished attempt still worth offering to resume, newest first. */
export function listAttempts() {
  const out = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(ATTEMPT_PREFIX)) continue;
      const href = key.slice(ATTEMPT_PREFIX.length);
      const saved = readAttempt(href);
      if (saved && saved.answered > 0) out.push({ ...saved, href });
    }
  } catch {
    return [];
  }
  return out.sort((a, b) => b.at - a.at);
}
