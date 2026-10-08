import { BANKS, findSection as findBankSection, getTopics, displayLabel } from "./banks";
import { getManifest, findSection, findGroup, findSubject } from "./data";
import { getExam } from "./exams";
import { getUserSubmissions } from "./submissions";
import { bi } from "./site-lang";
import { uiFormat } from "./ui-text";
import { scoreTrend } from "./score-trend";

/**
 * A signed-in candidate's dashboard: every paper they have scored, how the
 * scores are moving, and which papers to sit next.
 *
 * A saved result only carries the ids it was submitted with, so each one is
 * matched back to the paper it came from - which exam, its URL, its name in
 * the reader's language, and how many papers that subject has.
 */

const HISTORY_MAX = 300;
const NEXT_MAX = 4;
const RETRY_MAX = 3;
// Where an exam publishes no qualifying mark, a paper under this is still
// worth another attempt.
const RETRY_BELOW = 60;

// The ids were posted by the browser; only plain slugs may become a link.
const SLUG = /^[a-z0-9][a-z0-9-]*$/i;
const isSlug = (v) => typeof v === "string" && SLUG.test(v);

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/** Which exam a saved result belongs to, and the URL of its subject. */
function locate(row) {
  if (!isSlug(row.section_id) || !isSlug(row.group_id) || !isSlug(row.subject_id)) return null;

  const bank = BANKS.find((b) => b.resultPrefix === row.group_id);
  if (bank) {
    const prefix = `${bank.resultPrefix}-`;
    if (!row.section_id.startsWith(prefix)) return null;
    const section = findBankSection(bank, row.section_id.slice(prefix.length));
    if (!section) return null;
    return { examId: bank.id, bank, section, base: `${bank.base}/${section.id}/${row.subject_id}` };
  }
  // Everything else is UP TET, whose results keep their bare route ids.
  return {
    examId: "uptet",
    base: `/${row.section_id}/${row.group_id}/${row.subject_id}`,
  };
}

/**
 * Looks subjects up in the question banks, loading each bank section (and the
 * UP TET manifest) once however many results point at it. A lookup that fails
 * - a topic since removed, a bank not seeded - returns null and the result is
 * still listed, just without a link.
 */
function catalog(lang) {
  const topicsBySection = new Map();
  let manifest;

  return async function lookup(row, where) {
    try {
      if (where.bank) {
        const key = `${where.bank.id}/${where.section.id}`;
        if (!topicsBySection.has(key)) topicsBySection.set(key, getTopics(where.section));
        const topic = (await topicsBySection.get(key)).find((t) => t.id === row.subject_id);
        return topic ? { name: displayLabel(topic, lang), mocks: topic.mocks } : null;
      }

      manifest ??= getManifest();
      const section = findSection(await manifest, row.section_id);
      const group = findGroup(section, row.group_id);
      if (!group) return null;
      if (row.subject_id === `${row.section_id}-full`) {
        return {
          name: uiFormat(lang, "fullMockName", [section.name], [section.nameHi || section.name]),
          // The full-mock page offers exactly three papers.
          mocks: 3,
        };
      }
      const subject = findSubject(group, row.subject_id);
      return subject
        ? { name: bi(lang, subject.name, subject.nameHi, true), mocks: subject.mocks }
        : null;
    } catch {
      return null;
    }
  };
}

export async function getDashboard(userId, lang) {
  return buildDashboard(await getUserSubmissions(userId, HISTORY_MAX), lang);
}

/** @param rows saved results, newest first */
export async function buildDashboard(rows, lang) {
  const lookup = catalog(lang);

  // One entry per subject the candidate has touched, most recent first.
  const subjects = new Map();
  for (const row of rows) {
    const key = `${row.section_id}/${row.group_id}/${row.subject_id}`;
    if (subjects.has(key)) continue;
    const where = locate(row);
    const found = where ? await lookup(row, where) : null;
    const exam = where ? getExam(where.examId) : null;
    subjects.set(key, {
      key,
      examId: where?.examId || null,
      examName: exam?.name || row.section_name || "",
      passMark: exam?.cutoff?.general ?? null,
      name: found?.name || row.subject_name || "",
      mocks: found?.mocks || 0,
      // Only a subject that still exists gets a link; the page would 404.
      base: found ? where.base : null,
      best: new Map(), // mock number -> best percentage
    });
  }

  // Oldest first, so each paper can be compared with the one before it.
  const attempts = [];
  const lastPct = new Map();
  for (const row of [...rows].reverse()) {
    const subject = subjects.get(`${row.section_id}/${row.group_id}/${row.subject_id}`);
    const pct = Number(row.percentage) || 0;
    const mock = Number(row.mock_num) || 1;
    const before = lastPct.get(subject.key);
    lastPct.set(subject.key, pct);
    subject.best.set(mock, Math.max(pct, subject.best.get(mock) ?? 0));
    attempts.push({
      id: row.id,
      when: dateFmt.format(new Date(row.created_at)),
      examId: subject.examId,
      examName: subject.examName,
      name: subject.name,
      mock,
      pct,
      correct: row.correct,
      total: row.total,
      passMark: subject.passMark,
      href: subject.base && mock <= subject.mocks ? `${subject.base}/${mock}` : null,
      // Change from the previous paper in the same subject; null for the first.
      delta: before === undefined ? null : pct - before,
    });
  }

  const next = [];
  const retry = [];
  for (const s of subjects.values()) {
    if (!s.base) continue;
    for (let n = 1; n <= s.mocks; n += 1) {
      if (s.best.has(n)) continue;
      next.push({
        href: `${s.base}/${n}`,
        examId: s.examId,
        examName: s.examName,
        name: s.name,
        mock: n,
        done: [...s.best.keys()].filter((m) => m <= s.mocks).length,
        mocks: s.mocks,
      });
      break;
    }
    for (const [mock, pct] of s.best) {
      if (mock > s.mocks || pct >= (s.passMark ?? RETRY_BELOW)) continue;
      retry.push({
        href: `${s.base}/${mock}`,
        examId: s.examId,
        examName: s.examName,
        name: s.name,
        mock,
        pct,
      });
    }
  }
  retry.sort((a, b) => a.pct - b.pct);

  const pcts = attempts.map((a) => a.pct);
  const examIds = [...new Set(attempts.map((a) => a.examId).filter(Boolean))];

  return {
    attempts, // oldest first
    stats: {
      papers: attempts.length,
      average: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
      best: pcts.length ? Math.max(...pcts) : null,
      trend: scoreTrend(pcts),
    },
    exams: examIds.map((id) => ({ id, name: getExam(id)?.name || id })),
    next: next.slice(0, NEXT_MAX),
    retry: retry.slice(0, RETRY_MAX),
  };
}
