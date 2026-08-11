import { query, MOCK_SIZE } from "./db";

// ---------------------------------------------------------------------------
// CTET reads from `ctet_questions`, which keeps every parsed Excel row so the
// import stays auditable. Only rows that survived parsing are ever shown, and
// questions repeated across years are collapsed on `qkey`.
// ---------------------------------------------------------------------------

const USABLE = "is_gradable AND NOT is_duplicate_file";
const DEDUP = "COALESCE(qkey, 'id:' || id)";

const QUESTION_COLS =
  "question, option_a, option_b, option_c, option_d, correct, explanation";

// Subjects appear in the order a real paper runs them; anything unrecognised
// falls to the end rather than disappearing.
const SUBJECT_ORDER = [
  "child-development-pedagogy",
  "hindi",
  "english",
  "sanskrit",
  "mathematics",
  "environmental-studies",
  "mathematics-science",
  "social-studies",
];

/**
 * The Hindi section is organised by source workbook rather than by subject:
 * each Excel sheet is one literature topic. Files not listed here still show
 * up, labelled from their filename, so a new workbook is never silently lost.
 */
const HINDI_TOPICS = [
  { id: "adikal", name: "Adikal", nameHi: "आदिकाल", files: ["Adikal_PYQ_Extraction.xlsx"] },
  { id: "bhaktikal", name: "Bhaktikal", nameHi: "भक्तिकाल", files: ["Bhaktikal_PYQ_extraction.xlsx"] },
  { id: "ritikaal", name: "Ritikaal", nameHi: "रीतिकाल", files: ["Ritikaal_PYQ_Extraction.xlsx"] },
  {
    id: "kaal-vibhajan",
    name: "Kaal Vibhajan",
    nameHi: "नामकरण एवं काल-विभाजन",
    files: ["Hindi_Sahitya_ka_Itihas_Kaal_Vibhajan.xlsx"],
  },
  {
    id: "kahani",
    name: "Kahani",
    nameHi: "कहानी",
    files: ["Hindi_Kahani_PYQ.xlsx", "Hindi_Kahani_MCQ_Q993-Q1310.xlsx"],
  },
  { id: "upanyas", name: "Upanyas", nameHi: "उपन्यास", files: ["hindi_upanyas_mcq.xlsx"] },
  { id: "nibandh", name: "Nibandh", nameHi: "निबंध", files: ["Hindi_Nibandh_PYQ.xlsx"] },
  {
    id: "natak-ekanki",
    name: "Natak evam Ekanki",
    nameHi: "नाटक एवं एकांकी",
    files: ["CTET_Hindi_Natak_Ekanki.xlsx"],
  },
  {
    id: "gadya-vikas",
    name: "Gadya Vikas",
    nameHi: "गद्य साहित्य का विकास",
    files: ["CTET_Hindi_Gadya_Vikas.xlsx"],
  },
  { id: "atmakatha", name: "Atmakatha", nameHi: "आत्मकथा", files: ["Atmakatha_PYQ.xlsx"] },
  { id: "jeevani", name: "Jeevani", nameHi: "जीवनी", files: ["HINDI_Jeewani_PYQ.xlsx"] },
  {
    id: "anya-gadya-vidhayein",
    name: "Anya Gadya Vidhayein",
    nameHi: "अन्य गद्य विधाएँ",
    files: ["anya_gadya_vidhaayein_PYQ.xlsx"],
  },
  { id: "aalochana", name: "Aalochana", nameHi: "आलोचना", files: ["Aalochana_PYQ.xlsx"] },
  { id: "ras", name: "Ras evam Kavyashastra", nameHi: "रस एवं काव्यशास्त्र", files: ["Ras_Kavyashastra_PYQ.xlsx"] },
  { id: "alankar", name: "Alankar", nameHi: "अलंकार", files: ["Alankar_PYQ_Q691-851.xlsx"] },
  {
    id: "chhand",
    name: "Chhand",
    nameHi: "छंद",
    files: ["Bhartiya_Pashchatya_Kavyashastra_Chhand.xlsx"],
  },
  { id: "bhasha-vigyan", name: "Bhasha Vigyan", nameHi: "भाषा विज्ञान", files: ["Bhasha_Vigyan_PYQ.xlsx"] },
  {
    id: "patra-patrika",
    name: "Patra-Patrika evam Puraskar",
    nameHi: "पत्र-पत्रिका एवं पुरस्कार",
    files: ["Hindi_Patra_Patrika_evam_Puraskar_PYQ.xlsx"],
  },
];

export const CTET_SECTIONS = [
  {
    id: "paper1",
    name: "Paper 1",
    eyebrow: "Classes 1–5 · Primary level",
    blurb:
      "For candidates who want to teach at the primary level. Child Development & Pedagogy, the two languages, Mathematics and Environmental Studies.",
    facts: ["150 questions", "150 marks", "2½ hours", "No negative marking"],
    kind: "subject",
    scope: { examId: "ctet", paper: "paper1", stream: null },
  },
  {
    id: "paper2-science",
    name: "Paper 2 — Mathematics & Science",
    eyebrow: "Classes 6–8 · Upper primary",
    blurb:
      "For the upper primary Maths & Science stream. Child Development & Pedagogy, the two languages, plus Mathematics and Science.",
    facts: ["150 questions", "150 marks", "2½ hours", "No negative marking"],
    kind: "subject",
    scope: { examId: "ctet", paper: "paper2", stream: "science" },
  },
  {
    id: "paper2-sst",
    name: "Paper 2 — Social Studies",
    eyebrow: "Classes 6–8 · Upper primary",
    blurb:
      "For the upper primary Social Studies stream. Child Development & Pedagogy, the two languages, plus History, Geography and Civics.",
    facts: ["150 questions", "150 marks", "2½ hours", "No negative marking"],
    kind: "subject",
    scope: { examId: "ctet", paper: "paper2", stream: "sst" },
  },
  {
    id: "hindi",
    name: "Hindi Sahitya",
    eyebrow: "Hindi literature · हिन्दी साहित्य",
    blurb:
      "Topic-wise Hindi literature practice built from previous-year papers — Adikal to Adhunik kal, the gadya vidhas, kavyashastra and bhasha vigyan.",
    facts: ["Topic-wise", "30 per paper", "PYQ based", "Explanations included"],
    kind: "topic",
    scope: { examId: "hindi-sahitya" },
  },
];

export function findCtetSection(sectionId) {
  return CTET_SECTIONS.find((s) => s.id === sectionId) || null;
}

/** WHERE fragment + params that narrow `ctet_questions` down to one section. */
function scopeSql(section, startIndex = 1) {
  const { examId, paper, stream } = section.scope;
  const params = [examId];
  let sql = `exam_id = $${startIndex}`;
  if (paper !== undefined) {
    params.push(paper);
    sql += ` AND paper IS NOT DISTINCT FROM $${startIndex + params.length - 1}`;
  }
  if (stream !== undefined) {
    params.push(stream);
    sql += ` AND stream IS NOT DISTINCT FROM $${startIndex + params.length - 1}`;
  }
  return { sql, params };
}

function withMocks(topic) {
  return { ...topic, mocks: Math.max(1, Math.ceil(topic.total / MOCK_SIZE)) };
}

/** Turn a stray workbook name into something readable, e.g. "Hindi Kavya". */
function labelFromFile(file) {
  return file
    .replace(/\.xlsx?$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b(PYQ|MCQ|extraction|extracted|draft|questions?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugFromFile(file) {
  return (
    labelFromFile(file)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "topic"
  );
}

async function listSubjectTopics(section) {
  const scope = scopeSql(section);
  const { rows } = await query(
    `SELECT subject_id AS id,
            MIN(subject_name) AS name,
            COUNT(DISTINCT ${DEDUP})::int AS total
       FROM ctet_questions
      WHERE ${scope.sql} AND ${USABLE}
      GROUP BY subject_id`,
    scope.params
  );

  const rank = (id) => {
    const i = SUBJECT_ORDER.indexOf(id);
    return i === -1 ? SUBJECT_ORDER.length : i;
  };
  return rows
    .filter((r) => r.total > 0)
    .sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name))
    .map(withMocks);
}

async function listHindiTopics(section) {
  const scope = scopeSql(section);
  const { rows } = await query(
    `SELECT source_file AS file, COUNT(DISTINCT ${DEDUP})::int AS total
       FROM ctet_questions
      WHERE ${scope.sql} AND ${USABLE}
      GROUP BY source_file`,
    scope.params
  );

  // Files with no usable rows (e.g. the bad-OCR draft) never reach this map.
  const counts = new Map(rows.map((r) => [r.file, r.total]));
  const claimed = new Set();
  const topics = [];

  for (const t of HINDI_TOPICS) {
    const files = t.files.filter((f) => counts.has(f));
    files.forEach((f) => claimed.add(f));
    if (!files.length) continue;
    topics.push({ ...t, files });
  }

  // Anything the map does not mention still gets a card of its own.
  for (const r of rows) {
    if (claimed.has(r.file)) continue;
    topics.push({
      id: slugFromFile(r.file),
      name: labelFromFile(r.file),
      nameHi: null,
      files: [r.file],
    });
  }

  // A topic spanning two workbooks may repeat questions, so count it in one go.
  const totals = await Promise.all(
    topics.map(async (t) => {
      if (t.files.length === 1) return counts.get(t.files[0]) || 0;
      const { rows: n } = await query(
        `SELECT COUNT(DISTINCT ${DEDUP})::int AS total
           FROM ctet_questions
          WHERE ${scope.sql} AND ${USABLE} AND source_file = ANY($${
          scope.params.length + 1
        })`,
        [...scope.params, t.files]
      );
      return n[0].total;
    })
  );

  return topics
    .map((t, i) => ({ ...t, total: totals[i] }))
    .filter((t) => t.total > 0)
    .map(withMocks);
}

/** Subjects (Paper 1 / Paper 2) or literature topics (Hindi) for a section. */
export async function getCtetTopics(section) {
  return section.kind === "topic"
    ? listHindiTopics(section)
    : listSubjectTopics(section);
}

export async function findCtetTopic(section, topicId) {
  const topics = await getCtetTopics(section);
  return topics.find((t) => t.id === topicId) || null;
}

/** Question counts per section, for the CTET landing page. */
export async function getCtetOverview() {
  return Promise.all(
    CTET_SECTIONS.map(async (section) => {
      const topics = await getCtetTopics(section);
      return {
        ...section,
        topicCount: topics.length,
        total: topics.reduce((a, t) => a + t.total, 0),
        mocks: topics.reduce((a, t) => a + t.mocks, 0),
      };
    })
  );
}

/**
 * One mock paper: MOCK_SIZE questions, sliced deterministically so a given
 * mock number always contains the same questions.
 */
export async function getCtetMockQuestions(section, topic, mockNum) {
  const scope = scopeSql(section);
  const params = [...scope.params];

  let topicSql;
  if (section.kind === "topic") {
    params.push(topic.files);
    topicSql = `source_file = ANY($${params.length})`;
  } else {
    params.push(topic.id);
    topicSql = `subject_id = $${params.length}`;
  }

  params.push(MOCK_SIZE, (mockNum - 1) * MOCK_SIZE);

  const { rows } = await query(
    `SELECT ${QUESTION_COLS}
       FROM (
         SELECT DISTINCT ON (${DEDUP}) id, ${QUESTION_COLS}
           FROM ctet_questions
          WHERE ${scope.sql} AND ${topicSql} AND ${USABLE}
          ORDER BY ${DEDUP}, id
       ) q
      ORDER BY id
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return rows.map((r) => ({
    question: r.question,
    options: { A: r.option_a, B: r.option_b, C: r.option_c, D: r.option_d },
    correct: r.correct,
    explanation: r.explanation,
  }));
}

/** Label used on cards, breadcrumbs and saved results. */
export function topicLabel(topic) {
  return topic.nameHi ? `${topic.name} · ${topic.nameHi}` : topic.name;
}
