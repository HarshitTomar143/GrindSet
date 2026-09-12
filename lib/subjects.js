/**
 * Subject identity shared by every exam: the Hindi name and the icon a subject
 * card shows. Keyed by the subject ids both question tables use, so UP TET's
 * `questions` and CTET's `ctet_questions` resolve to the same entries, and the
 * UP TGT/PGT subject sections share the same ids.
 */
export const SUBJECTS = {
  "child-development-pedagogy": {
    icon: "child",
    en: "Child Development & Pedagogy",
    hi: "बाल विकास एवं शिक्षाशास्त्र",
  },
  hindi: { icon: "hindi", en: "Hindi", hi: "हिन्दी" },
  english: { icon: "english", en: "English", hi: "अंग्रेज़ी" },
  sanskrit: { icon: "sanskrit", en: "Sanskrit", hi: "संस्कृत" },
  mathematics: { icon: "math", en: "Mathematics", hi: "गणित" },
  "environmental-studies": { icon: "evs", en: "Environmental Studies", hi: "पर्यावरण अध्ययन" },
  "mathematics-science": { icon: "science", en: "Mathematics & Science", hi: "गणित एवं विज्ञान" },
  "social-studies": { icon: "social", en: "Social Studies", hi: "सामाजिक अध्ययन" },
  "general-studies": { icon: "gs", en: "General Studies", hi: "सामान्य अध्ययन" },
};

export function subjectNameHi(id) {
  return SUBJECTS[id]?.hi || null;
}

export function subjectIcon(id) {
  return SUBJECTS[id]?.icon || null;
}

/** Hindi for UP TET's own section and group names, which come from the data. */
export function uptetNameHi(name) {
  const paper = /^Paper\s*(\d+)$/i.exec(name || "");
  if (paper) return `पेपर ${paper[1]}`;
  if (name === "Subjects") return "विषय";
  return null;
}

/**
 * The first letter of a title, as one grapheme so a Devanagari conjunct is not
 * cut in half. Computed on the server only: browsers and Node can disagree on
 * grapheme boundaries, which would break hydration.
 */
export function firstLetter(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  if (typeof Intl.Segmenter === "function") {
    const [first] = new Intl.Segmenter("hi", { granularity: "grapheme" }).segment(s);
    return first.segment.toUpperCase();
  }
  return s[0].toUpperCase();
}

/**
 * Card data for a subject or topic, resolved to plain strings here because
 * TopicGrid runs on the client and cannot be handed ui-text's functions.
 *
 * Hindi leads in "hi" and "both" (with the English name under it in "both");
 * English leads in "en". A literature topic whose English name is only a
 * transliteration keeps its Devanagari name underneath even in "en".
 */
export function topicCard(item, { href, lang, T, withIcon = true, hiSubInEn = false }) {
  const hi = item.nameHi && item.nameHi !== item.name ? item.nameHi : null;
  const title = lang === "en" ? item.name : hi || item.name;
  let sub = null;
  if (lang === "both" && hi) sub = item.name;
  if (lang === "en" && hiSubInEn && hi) sub = hi;

  return {
    id: item.id,
    href,
    title,
    sub,
    icon: withIcon ? subjectIcon(item.id) : null,
    letter: firstLetter(title),
    questions: T.questionCount(item.total),
    papers: T.mockCount(item.mocks),
    mocks: item.mocks,
  };
}
