import { query } from "./db";
import { bi } from "./site-lang";

/**
 * Data access for the MP Police Constable bank.
 *
 * It lives in its own table (`mp_police_questions`, loaded by
 * seed_mp_police.mjs) because its rows are shaped differently from
 * `ctet_questions`: one row per question of a real sitting, English and Hindi
 * in separate columns, and a diagram URL for figure questions. lib/banks.js
 * hands any section marked `source: "mp-police"` to the functions here, so the
 * four bank pages work unchanged.
 *
 * Only `is_gradable` rows are ever served. That flag already excludes a figure
 * question whose picture was never supplied, so a candidate is never shown
 * "in the given figure" with no figure.
 */

const TABLE = "mp_police_questions";

// The papers name the same subject differently from sitting to sitting
// ("General Maths", "Numerical Ability", "Mathematics"); practice is grouped
// under one name each. `sections` are the labels exactly as the papers print.
export const MP_SUBJECTS = [
  {
    id: "general-knowledge",
    name: "General Knowledge",
    nameHi: "सामान्य ज्ञान",
    sections: ["General Knowledge"],
  },
  {
    id: "general-science",
    name: "General Science",
    nameHi: "सामान्य विज्ञान",
    sections: ["General Science"],
  },
  {
    id: "reasoning",
    name: "Reasoning & Mental Ability",
    nameHi: "तर्कशक्ति एवं मानसिक योग्यता",
    sections: ["General Reasoning", "Mental Ability"],
  },
  {
    id: "mathematics",
    name: "Mathematics",
    nameHi: "गणित",
    sections: ["General Maths", "General Aptitude", "Numerical Ability", "Mathematics"],
  },
  {
    id: "situational-judgement",
    name: "Situational Judgement",
    nameHi: "परिस्थितिजन्य निर्णय",
    sections: ["Situational Judgement", "Situational Judgment", "Ethics & Situational Judgement"],
  },
  {
    id: "computer",
    name: "Computer Knowledge",
    nameHi: "कम्प्यूटर ज्ञान",
    sections: ["Computer Knowledge", "Computer"],
  },
  {
    id: "technical",
    name: "Electronics, Electrical & Workshop",
    nameHi: "इलेक्ट्रॉनिक्स, विद्युत एवं कार्यशाला",
    sections: ["Electronics & Communication", "Electrical", "Workshop & Safety"],
  },
];

const SUBJECT_BY_SECTION = new Map(
  MP_SUBJECTS.flatMap((s) => s.sections.map((label) => [label, s]))
);

// A sitting whose paper is not the general constable paper.
const SITTING_NOTES = {
  "2023-08-27-s3": { en: "Technical paper", hi: "तकनीकी पेपर" },
};

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_HI = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];

/** "23 Aug 2023 · Shift 1" / "23 अगस्त 2023 · पाली 1" for one sitting row. */
function sittingNames(r) {
  let en = String(r.exam_year);
  let hi = String(r.exam_year);
  if (r.exam_date) {
    // exam_date is selected as 'YYYY-MM-DD' text, so no timezone can shift it.
    const [y, m, d] = r.exam_date.split("-").map(Number);
    en = `${d} ${MONTHS_EN[m - 1]} ${y}`;
    hi = `${d} ${MONTHS_HI[m - 1]} ${y}`;
  }
  if (r.shift) {
    en += ` · Shift ${r.shift}`;
    hi += ` · पाली ${r.shift}`;
  }
  const note = SITTING_NOTES[r.sitting_id];
  if (note) {
    en += ` (${note.en})`;
    hi += ` (${note.hi})`;
  }
  return { name: en, nameHi: hi };
}

/** One card per real sitting, newest first. */
async function listSittings() {
  const { rows } = await query(
    `SELECT sitting_id, exam_year, shift,
            to_char(exam_date, 'YYYY-MM-DD') AS exam_date,
            COUNT(*)::int AS total
       FROM ${TABLE}
      WHERE is_gradable
      GROUP BY sitting_id, exam_year, shift, exam_date
      ORDER BY exam_year DESC, exam_date DESC NULLS LAST, shift DESC`
  );
  return rows.map((r) => ({
    id: r.sitting_id,
    ...sittingNames(r),
    // Tile text on the paper's card: the day it was held.
    letter: r.exam_date ? String(Number(r.exam_date.slice(8))) : "–",
    year: r.exam_year,
    total: r.total,
  }));
}

/** One card per subject, in the order above. */
async function listSubjects() {
  const { rows } = await query(
    `SELECT section, COUNT(*)::int AS total
       FROM ${TABLE}
      WHERE is_gradable
      GROUP BY section`
  );
  const totals = new Map();
  for (const r of rows) {
    const subject = SUBJECT_BY_SECTION.get(r.section);
    if (!subject) continue;
    totals.set(subject.id, (totals.get(subject.id) || 0) + r.total);
  }
  return MP_SUBJECTS.filter((s) => totals.get(s.id)).map((s) => ({
    id: s.id,
    name: s.name,
    nameHi: s.nameHi,
    sections: s.sections,
    total: totals.get(s.id),
  }));
}

export async function listMpTopics(section) {
  return section.kind === "topic" ? listSittings() : listSubjects();
}

/** Year headings for the previous-year papers, newest year first. */
export function groupMpTopics(topics) {
  const years = [...new Set(topics.map((t) => t.year))].sort((a, b) => b - a);
  return years.map((year) => ({
    id: String(year),
    // A year needs no second-language caption under it.
    name: String(year),
    topics: topics.filter((t) => t.year === year),
  }));
}

const DEVANAGARI = /[ऀ-ॿ]/;

/**
 * English and Hindi as the single "English / हिन्दी" string lib/lang.js splits
 * again for the reader's language. The Hindi half is dropped when it adds
 * nothing (a number, a formula, or a copy of the English).
 */
function joinLang(en, hi) {
  if (!en) return hi || "";
  if (!hi || hi === en || !DEVANAGARI.test(hi)) return en;
  return `${en} / ${hi}`;
}

const LETTERS = ["a", "b", "c", "d"];

function mapRow(r, lang, withSection) {
  const options = {};
  for (const L of LETTERS) {
    // Workbooks word a picture-only option differently ("(see image)",
    // "Option (a)", "Figure (a)"); the candidate sees one consistent label.
    options[L.toUpperCase()] = r.options_are_figures
      ? `Figure\u00a0(${L}) / आकृति\u00a0(${L})`
      : joinLang(r[`option_${L}_en`], r[`option_${L}_hi`]);
  }
  const q = {
    question: joinLang(r.question_en, r.question_hi),
    options,
    correct: r.correct,
    explanation: joinLang(r.explanation_en, r.explanation_hi),
  };
  if (r.diagram_url) {
    q.image = { src: r.diagram_url, width: r.diagram_width, height: r.diagram_height };
  }
  const subject = SUBJECT_BY_SECTION.get(r.section);
  if (withSection && subject) {
    // Feeds the section tag on each question and the report card's
    // section-by-section breakdown, as on a UP TET full mock.
    q.sectionName = bi(lang, subject.name, subject.nameHi, true);
    q.sectionLabel = q.sectionName;
  }
  return q;
}

const QUESTION_COLS = `section, question_en, question_hi,
  option_a_en, option_b_en, option_c_en, option_d_en,
  option_a_hi, option_b_hi, option_c_hi, option_d_hi,
  correct, explanation_en, explanation_hi,
  options_are_figures, diagram_url, diagram_width, diagram_height`;

/**
 * One paper of a topic. A sitting is served whole, in the order it was set; a
 * subject is sliced newest paper first, deterministically, so a given mock
 * number always holds the same questions.
 */
export async function getMpMockQuestions(section, topic, mockNum, size, lang) {
  const offset = (mockNum - 1) * size;
  if (section.kind === "topic") {
    const { rows } = await query(
      `SELECT ${QUESTION_COLS}
         FROM ${TABLE}
        WHERE sitting_id = $1 AND is_gradable
        ORDER BY q_no
        LIMIT $2 OFFSET $3`,
      [topic.id, size, offset]
    );
    return rows.map((r) => mapRow(r, lang, true));
  }
  const { rows } = await query(
    `SELECT ${QUESTION_COLS}
       FROM ${TABLE}
      WHERE section = ANY($1) AND is_gradable
      ORDER BY exam_year DESC, sitting_id DESC, q_no
      LIMIT $2 OFFSET $3`,
    [topic.sections, size, offset]
  );
  return rows.map((r) => mapRow(r, lang, false));
}
