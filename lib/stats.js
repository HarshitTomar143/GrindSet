import { query, MOCK_SIZE } from "./db";
import { findBank, getBankOverview } from "./banks";

/**
 * Headline counts for the exam chooser: how many questions and mock papers
 * each exam actually carries right now.
 *
 * These are read straight from the same tables the quiz reads, so the chooser
 * can never advertise papers that are not there. The numbers move only when
 * the database is reseeded, so they are memoised per process — the chooser is
 * the most-hit page in the app and does not need to re-count on every request.
 */

const TTL_MS = 10 * 60 * 1000;
const cache = new Map(); // key -> { at, value }

async function memo(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** UP TET lives in its own `questions` table, one row per question. */
async function uptetStats() {
  const { rows } = await query(
    `SELECT section_id, subject_id, COUNT(*)::int AS total
       FROM questions
      GROUP BY section_id, subject_id`
  );
  return {
    questions: rows.reduce((a, r) => a + r.total, 0),
    mocks: rows.reduce((a, r) => a + Math.ceil(r.total / MOCK_SIZE), 0),
    parts: new Set(rows.map((r) => r.section_id)).size,
    partKind: "papers",
  };
}

/** CTET and UP TGT/PGT share `ctet_questions`, split by the bank's sections. */
async function bankStats(bankId) {
  const bank = findBank(bankId);
  if (!bank) return null;
  const sections = await getBankOverview(bank);
  const live = sections.filter((s) => s.total > 0);
  return {
    questions: live.reduce((a, s) => a + s.total, 0),
    mocks: live.reduce((a, s) => a + s.mocks, 0),
    parts: live.reduce((a, s) => a + s.topicCount, 0),
    // The word is chosen by the page, in the reader's language.
    partKind: bankId === "ctet" ? "subjects" : "topics",
  };
}

const LOADERS = {
  uptet: uptetStats,
  ctet: () => bankStats("ctet"),
  "up-tgt-pgt": () => bankStats("up-tgt-pgt"),
};

/**
 * Counts for one exam, or null if its table is missing or unreachable — the
 * chooser then simply renders that card without numbers instead of failing.
 */
export async function getExamStats(examId) {
  const load = LOADERS[examId];
  if (!load) return null;
  try {
    return await memo(examId, load);
  } catch {
    return null;
  }
}

/** Counts for every exam, keyed by exam id. Never throws. */
export async function getAllExamStats() {
  const ids = Object.keys(LOADERS);
  const values = await Promise.all(ids.map(getExamStats));
  return Object.fromEntries(ids.map((id, i) => [id, values[i]]));
}
