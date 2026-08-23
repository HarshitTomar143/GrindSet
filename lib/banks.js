import { query, MOCK_SIZE } from "./db";

// ---------------------------------------------------------------------------
// Question banks that read from `ctet_questions`, the table that keeps every
// parsed Excel row so the import stays auditable. Only rows that survived
// parsing are ever shown, and questions repeated across years are collapsed
// on `qkey`.
//
// One table, several exams: the parser stamps each row with an `exam_id`, so
// CTET's papers and the UP TGT/PGT Hindi Sahitya bank live side by side here
// while staying completely separate on screen.
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
 * Hindi is organised by source workbook rather than by subject: each Excel
 * sheet is one literature topic. Files not listed here still show up, labelled
 * from their filename, so a new workbook is never silently lost.
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

  // Vyakaran, in the order the grammar syllabus runs: letters and words first,
  // then word formation, then vocabulary, then sentence-level topics.
  {
    id: "varn-varnmala",
    name: "Varn evam Varnmala",
    nameHi: "वर्ण एवं वर्णमाला",
    files: ["Vyakaran_Varn_aur_Varnmala.xlsx"],
  },
  {
    id: "sanjna-avyay",
    name: "Sanjna se Avyay tak",
    nameHi: "संज्ञा से अव्यय तक",
    files: ["Vyakaran_Sanjna_se_Avyay_tak.xlsx"],
  },
  { id: "ling", name: "Ling", nameHi: "लिंग", files: ["5-VYAKARAN_Ling_Chapter4.xlsx"] },
  { id: "vachan", name: "Vachan", nameHi: "वचन", files: ["5-Vyakaran-Vachan.xlsx"] },
  { id: "karak", name: "Karak", nameHi: "कारक", files: ["Karak_Vyakaran.xlsx"] },
  { id: "sandhi", name: "Sandhi", nameHi: "संधि", files: ["Sandhi_Questions.xlsx"] },
  { id: "samas", name: "Samas", nameHi: "समास", files: ["Vyakaran_Samas.xlsx"] },
  {
    id: "upsarg-pratyay",
    name: "Upsarg evam Pratyay",
    nameHi: "उपसर्ग एवं प्रत्यय",
    files: ["Upsarg_Pratyay_YCT.xlsx"],
  },
  {
    id: "tatsam-tadbhav",
    name: "Tatsam, Tadbhav evam Sankar",
    nameHi: "तत्सम, तद्भव एवं संकर",
    files: ["Vyakaran_Tadbhav_Tatsam_Sankar.xlsx"],
  },
  {
    id: "paryayvachi-shabd-yugm",
    name: "Paryayvachi, Ekarthi, Anekarthi evam Shabd-Yugm",
    nameHi: "पर्यायवाची, एकार्थी, अनेकार्थी एवं शब्द-युग्म",
    files: ["Vyakaran_Paryayvachi_Ekarthi_Anekarthi_ShabdYugm.xlsx"],
  },
  { id: "vilom", name: "Vilom", nameHi: "विलोम", files: ["Vilom_Vyakaran.xlsx"] },
  {
    id: "vartani-vakya-shuddhi",
    name: "Vartani, Vakya-Shuddhi evam Vakyansh",
    nameHi: "वर्तनी, वाक्य-शुद्धीकरण एवं वाक्यांश",
    files: ["VYAKARAN_Vartni_Vakya_Shudhikaran_Vakyansh.xlsx"],
  },
  {
    id: "muhavare-lokoktiyan",
    name: "Muhavare evam Lokoktiyan",
    nameHi: "मुहावरे एवं लोकोक्तियाँ",
    files: ["13-Vyakaran_Muhavare_and_Lokokti.xlsx"],
  },

  {
    id: "sanskrit-vyakaran",
    name: "Sanskrit Vyakaran",
    nameHi: "संस्कृत व्याकरण",
    files: ["Sanskrit_Vyakaran_YCT.xlsx"],
  },
  {
    id: "sanskrit-sahitya",
    name: "Sanskrit Sahitya",
    nameHi: "संस्कृत साहित्य",
    files: ["Sanskrit_Sahitya_Questions.xlsx"],
  },

  {
    id: "hindi-shikshan-patrakarita",
    name: "Hindi Shikshan evam Patrakarita",
    nameHi: "हिन्दी शिक्षण एवं पत्रकारिता",
    files: ["Vyakaran_Ch14_Hindi_Shikshan_Patrakarita.xlsx"],
  },
  { id: "vividh", name: "Vividh", nameHi: "विविध", files: ["Vividh_Chapter12.xlsx"] },
];

/**
 * The syllabus units the Hindi topics sit under, in syllabus order. Topics are
 * listed by id; one that has no questions loaded yet is simply skipped, and a
 * topic named in no unit still gets shown under "Other topics" rather than
 * being dropped.
 */
const HINDI_UNITS = [
  {
    id: "sahitya-itihas",
    name: "Hindi Sahitya ka Itihas",
    nameHi: "हिन्दी साहित्य का इतिहास",
    topics: ["kaal-vibhajan", "adikal", "bhaktikal", "ritikaal"],
  },
  {
    id: "gadya-itihas",
    name: "Hindi Gadya Sahitya ka Itihas",
    nameHi: "हिन्दी गद्य साहित्य का इतिहास",
    topics: [
      "gadya-vikas",
      "natak-ekanki",
      "upanyas",
      "kahani",
      "nibandh",
      "aalochana",
      "atmakatha",
      "jeevani",
      "anya-gadya-vidhayein",
      "patra-patrika",
    ],
  },
  {
    id: "kavyashastra",
    name: "Bhartiya evam Pashchatya Kavyashastra",
    nameHi: "भारतीय एवं पाश्चात्य काव्यशास्त्र",
    topics: ["ras", "chhand", "alankar"],
  },
  {
    id: "bhasha-vigyan",
    name: "Bhasha Vigyan",
    nameHi: "भाषा विज्ञान",
    topics: ["bhasha-vigyan"],
  },
  {
    id: "vyakaran",
    name: "Hindi Vyakaran",
    nameHi: "हिन्दी व्याकरण",
    topics: [
      "varn-varnmala",
      "sanjna-avyay",
      "ling",
      "vachan",
      "karak",
      "sandhi",
      "samas",
      "upsarg-pratyay",
      "tatsam-tadbhav",
      "paryayvachi-shabd-yugm",
      "vilom",
      "vartani-vakya-shuddhi",
      "muhavare-lokoktiyan",
    ],
  },
  {
    id: "sanskrit",
    name: "Sanskrit",
    nameHi: "संस्कृत",
    topics: ["sanskrit-vyakaran", "sanskrit-sahitya"],
  },
  {
    id: "shikshan-vividh",
    name: "Hindi Shikshan, Patrakarita evam Vividh",
    nameHi: "हिन्दी शिक्षण, पत्रकारिता एवं विविध",
    topics: ["hindi-shikshan-patrakarita", "vividh"],
  },
];

const CTET_SECTIONS = [
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
];

const UP_TGT_PGT_SECTIONS = [
  {
    id: "hindi",
    name: "Hindi",
    nameHi: "हिन्दी",
    eyebrow: "Subject · विषय",
    blurb:
      "The Hindi paper laid out the way the syllabus runs it — sahitya ka itihas, gadya sahitya ka itihas, kavyashastra, bhasha vigyan, vyakaran and sanskrit, each split into its own topics.",
    facts: ["Syllabus-wise", "30 per paper", "PYQ based", "Explanations included"],
    kind: "topic",
    scope: { examId: "hindi-sahitya" },
    topics: HINDI_TOPICS,
    groups: HINDI_UNITS,
  },
];

/**
 * Everything a bank's four pages need: where it lives in the URL, how it is
 * introduced, the command that loads it, and its sections. `resultPrefix`
 * keeps saved results separable in the admin dashboard, which keys on ids.
 */
export const BANKS = [
  {
    id: "ctet",
    base: "/ctet",
    name: "CTET",
    resultPrefix: "ctet",
    setupCommand: "npm run setup:ctet",
    chooseTitle: "CTET · Choose a section",
    chooseSub:
      "Every section is split into mock papers of 30 questions, scored as soon as you submit. Paper 1 and Paper 2 are organised by subject, exactly as the real paper runs them.",
    sections: CTET_SECTIONS,
  },
  {
    id: "up-tgt-pgt",
    base: "/up-tgt-pgt",
    name: "UP TGT / PGT",
    resultPrefix: "uptgt",
    setupCommand: "npm run setup:ctet",
    chooseTitle: "UP TGT / PGT · Choose a subject",
    chooseSub:
      "Practice for the UP TGT and PGT recruitment exams. Each subject follows the syllabus sections, and every topic inside them is split into mock papers of 30 questions.",
    sections: UP_TGT_PGT_SECTIONS,
  },
];

export function findBank(bankId) {
  return BANKS.find((b) => b.id === bankId) || null;
}

export function findSection(bank, sectionId) {
  return bank.sections.find((s) => s.id === sectionId) || null;
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

async function listFileTopics(section) {
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

  for (const t of section.topics || []) {
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

/** Subjects (a paper's syllabus) or literature topics, depending on section. */
export async function getTopics(section) {
  return section.kind === "topic"
    ? listFileTopics(section)
    : listSubjectTopics(section);
}

export async function findTopic(section, topicId) {
  const topics = await getTopics(section);
  return topics.find((t) => t.id === topicId) || null;
}

/**
 * Topics arranged under their syllabus units. Returns null for a section that
 * has no units, so callers fall back to a plain list.
 */
export async function getGroupedTopics(section) {
  if (!section.groups) return null;
  const topics = await getTopics(section);
  const byId = new Map(topics.map((t) => [t.id, t]));
  const claimed = new Set();

  const groups = section.groups
    .map((g) => {
      // Unit order wins over the order the topics came back in.
      const list = g.topics.map((id) => byId.get(id)).filter(Boolean);
      list.forEach((t) => claimed.add(t.id));
      return { ...g, topics: list };
    })
    .filter((g) => g.topics.length);

  const rest = topics.filter((t) => !claimed.has(t.id));
  if (rest.length) {
    groups.push({
      id: "other",
      name: "Other topics",
      nameHi: null,
      topics: rest,
    });
  }
  return groups;
}

/** Question counts per section, for a bank's landing page. */
export async function getBankOverview(bank) {
  return Promise.all(
    bank.sections.map(async (section) => {
      const topics = await getTopics(section);
      const groups = await getGroupedTopics(section);
      return {
        ...section,
        topicCount: topics.length,
        groupCount: groups ? groups.length : 0,
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
export async function getMockQuestions(section, topic, mockNum) {
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
export function displayLabel(item) {
  return item.nameHi ? `${item.name} · ${item.nameHi}` : item.name;
}
