import { loc } from "./site-lang";

/**
 * Who runs each exam, what its logo is, and how the real paper is built.
 *
 * The logos in /public/exams are the conducting bodies' own emblems, taken
 * from their official sites, because that is the mark a candidate actually
 * recognises:
 *
 *   CTET        CBSE emblem                  cbse.gov.in
 *   UP TGT/PGT  UPESSC emblem                upessc.up.gov.in
 *   UP TET      Uttar Pradesh state seal     the emblem the Pareeksha Niyamak
 *                                            Pradhikari prints on its own
 *                                            masthead (updeled.gov.in)
 *   MP Police   MPESB mark                   esb.mp.gov.in (the board that
 *                                            conducts the constable exam)
 *
 * Display copy is { en, hi }; getExam/listExams resolve it for a site language
 * (see lib/site-lang.js). Everything here is display-only: no page depends on
 * it for routing or for loading questions, so an exam with no entry still
 * works, just without the badging.
 */

const TET_PAPERS = {
  en: "Paper 1 (Classes 1–5) · Paper 2 (Classes 6–8)",
  hi: "पेपर 1 (कक्षा 1–5) · पेपर 2 (कक्षा 6–8)",
};

const TET_PATTERN = [
  [{ en: "Questions", hi: "प्रश्न" }, { en: "150 MCQs", hi: "150 बहुविकल्पीय प्रश्न" }],
  [{ en: "Marks", hi: "अंक" }, "150"],
  [{ en: "Duration", hi: "अवधि" }, { en: "2 hours 30 minutes", hi: "2 घंटे 30 मिनट" }],
  [{ en: "Negative marking", hi: "ऋणात्मक अंकन" }, { en: "None", hi: "नहीं" }],
];

export const EXAMS = {
  uptet: {
    id: "uptet",
    href: "/uptet",
    name: "UP TET",
    fullName: {
      en: "Uttar Pradesh Teacher Eligibility Test",
      hi: "उत्तर प्रदेश शिक्षक पात्रता परीक्षा",
    },
    // The state seal, which is what the exam's own authority uses as its mark.
    logo: "/exams/uptet.svg",
    logoAlt: "Emblem of the Government of Uttar Pradesh",
    authority: {
      en: "Pareeksha Niyamak Pradhikari (Examination Regulatory Authority), U.P.",
      hi: "परीक्षा नियामक प्राधिकारी, उत्तर प्रदेश",
    },
    authorityShort: { en: "UPBEB · Uttar Pradesh", hi: "UPBEB · उत्तर प्रदेश" },
    tagline: {
      en: "Paper 1 and Paper 2 practice, subject by subject, plus full-length 150-question mocks that follow the real paper.",
      hi: "पेपर 1 और पेपर 2 का विषयवार अभ्यास, साथ में असली पेपर जैसे 150 प्रश्नों के पूर्ण मॉक।",
    },
    papers: TET_PAPERS,
    pattern: TET_PATTERN,
    qualifying: {
      en: "60% to qualify · 55% for OBC / SC / ST",
      hi: "उत्तीर्ण होने के लिए 60% · OBC / SC / ST के लिए 55%",
    },
    cutoff: { general: 60, reserved: 55 },
    facts: {
      en: ["Paper 1 & Paper 2", "Subject mocks", "Full 150-Q mocks", "Bilingual"],
      hi: ["पेपर 1 और पेपर 2", "विषयवार मॉक", "पूर्ण 150-प्रश्न मॉक", "द्विभाषी"],
    },
  },

  ctet: {
    id: "ctet",
    href: "/ctet",
    name: "CTET",
    fullName: { en: "Central Teacher Eligibility Test", hi: "केंद्रीय शिक्षक पात्रता परीक्षा" },
    logo: "/exams/ctet.png",
    logoAlt: "Central Board of Secondary Education emblem",
    authority: {
      en: "Central Board of Secondary Education",
      hi: "केंद्रीय माध्यमिक शिक्षा बोर्ड",
    },
    authorityShort: "CBSE",
    tagline: {
      en: "Previous-year practice for Paper 1 and both Paper 2 streams, organised subject by subject the way the real paper runs.",
      hi: "पेपर 1 और पेपर 2 के दोनों वर्गों का विगत वर्षों के प्रश्नों से अभ्यास, असली पेपर की तरह विषयवार।",
    },
    papers: TET_PAPERS,
    pattern: TET_PATTERN,
    qualifying: {
      en: "60% to qualify · relaxation for reserved categories per state norms",
      hi: "उत्तीर्ण होने के लिए 60% · आरक्षित वर्गों को नियमानुसार छूट",
    },
    cutoff: { general: 60, reserved: 55 },
    facts: {
      en: ["Paper 1", "Paper 2 Science", "Paper 2 SST", "PYQ based"],
      hi: ["पेपर 1", "पेपर 2 विज्ञान", "पेपर 2 सामाजिक अध्ययन", "विगत वर्षों के प्रश्न"],
    },
  },

  "up-tgt-pgt": {
    id: "up-tgt-pgt",
    href: "/up-tgt-pgt",
    name: "UP TGT / PGT",
    fullName: {
      en: "Trained Graduate & Post Graduate Teacher recruitment",
      hi: "प्रशिक्षित स्नातक (TGT) एवं प्रवक्ता (PGT) शिक्षक भर्ती",
    },
    logo: "/exams/up-tgt-pgt.png",
    logoAlt: "Uttar Pradesh Education Services Selection Commission emblem",
    authority: {
      en: "U.P. Education Services Selection Commission",
      hi: "उत्तर प्रदेश शिक्षा सेवा चयन आयोग",
    },
    authorityShort: { en: "UPESSC · Prayagraj", hi: "UPESSC · प्रयागराज" },
    tagline: {
      en: "Subject practice laid out the way the syllabus index runs — every unit opened into its own topics, every topic split into papers.",
      hi: "पाठ्यक्रम की सूची के क्रम में विषयवार अभ्यास — हर इकाई अपने अध्यायों में, हर अध्याय पेपरों में बँटा हुआ।",
    },
    papers: { en: "TGT (Classes 9–10) · PGT (Classes 11–12)", hi: "TGT (कक्षा 9–10) · PGT (कक्षा 11–12)" },
    pattern: [
      [{ en: "Questions", hi: "प्रश्न" }, { en: "125 MCQs", hi: "125 बहुविकल्पीय प्रश्न" }],
      [{ en: "Duration", hi: "अवधि" }, { en: "2 hours", hi: "2 घंटे" }],
      [
        { en: "Stage", hi: "चरण" },
        { en: "Written exam, then interview for PGT", hi: "लिखित परीक्षा, PGT के लिए साक्षात्कार भी" },
      ],
    ],
    // UPESSC revised the pattern for the current cycle and the marking scheme
    // has been reported differently by different outlets, so the app points at
    // the notification rather than printing a number it cannot stand behind.
    patternNote: {
      en: "UPESSC has revised this pattern — confirm the marking scheme in the current official notification.",
      hi: "UPESSC ने यह पैटर्न संशोधित किया है — अंकन योजना की पुष्टि वर्तमान आधिकारिक अधिसूचना से करें।",
    },
    qualifying: null,
    cutoff: null,
    facts: {
      en: ["Hindi", "English", "General Studies", "Syllabus-wise"],
      hi: ["हिन्दी", "अंग्रेज़ी", "सामान्य अध्ययन", "पाठ्यक्रम के अनुसार"],
    },
  },

  "mp-police": {
    id: "mp-police",
    href: "/mp-police",
    name: "MP Police",
    fullName: {
      en: "Madhya Pradesh Police Constable Recruitment Test",
      hi: "मध्य प्रदेश पुलिस आरक्षक भर्ती परीक्षा",
    },
    // The ESB letterform, cropped from the board's logo so it stays legible
    // at card size (the full logo carries a caption too small to read there).
    logo: "/exams/mp-police.png",
    logoAlt: "Madhya Pradesh Employees Selection Board logo",
    authority: {
      en: "M.P. Employees Selection Board, Bhopal",
      hi: "मध्य प्रदेश कर्मचारी चयन मंडल, भोपाल",
    },
    authorityShort: { en: "MPESB · Bhopal", hi: "MPESB · भोपाल" },
    tagline: {
      en: "The actual constable papers of 2023 and 2025, shift by shift, with their figures and diagrams — plus the same questions regrouped by subject.",
      hi: "2023 और 2025 के असली आरक्षक पेपर, पाली दर पाली, अपनी आकृतियों और चित्रों के साथ — और वही प्रश्न विषयवार भी।",
    },
    papers: { en: "Constable written exam", hi: "आरक्षक लिखित परीक्षा" },
    pattern: [
      [{ en: "Questions", hi: "प्रश्न" }, { en: "100 MCQs", hi: "100 बहुविकल्पीय प्रश्न" }],
      [{ en: "Marks", hi: "अंक" }, "100"],
      [{ en: "Duration", hi: "अवधि" }, { en: "2 hours", hi: "2 घंटे" }],
      [{ en: "Negative marking", hi: "ऋणात्मक अंकन" }, { en: "None", hi: "नहीं" }],
    ],
    // The board's qualifying rules differ by category and by cycle, so no pass
    // mark is printed here and the report card shows no verdict.
    patternNote: {
      en: "The written exam is followed by a physical efficiency test — check the current MPESB rulebook for qualifying marks.",
      hi: "लिखित परीक्षा के बाद शारीरिक दक्षता परीक्षा होती है — अर्हक अंकों के लिए MPESB की वर्तमान नियम पुस्तिका देखें।",
    },
    qualifying: null,
    cutoff: null,
    // Leads the chooser as the full-width card, with this badge beside its name.
    featured: true,
    badge: { en: "New", hi: "नया" },
    facts: {
      en: ["Previous-year papers", "With diagrams", "Subject-wise", "Bilingual"],
      hi: ["विगत वर्षों के पेपर", "चित्रों सहित", "विषयवार", "द्विभाषी"],
    },
  },
};

/** An exam with its display copy resolved for one site language. */
function localize(exam, lang) {
  if (!exam || !lang) return exam;
  const out = {};
  for (const [key, value] of Object.entries(exam)) out[key] = loc(value, lang);
  // The one-line authority label on a chooser card truncates; in "both" the
  // Hindi version alone fits, and the full authority is on the exam's page.
  if (lang === "both") out.authorityShort = loc(exam.authorityShort, "hi");
  out.pattern = (exam.pattern || []).map(([label, value]) => [
    loc(label, lang),
    loc(value, lang),
  ]);
  return out;
}

/**
 * Exam identity for a bank/exam id, or null when the exam is not registered.
 * Without `lang` the raw entry comes back, which is enough for logo/cutoff.
 */
export function getExam(id, lang) {
  return localize(EXAMS[id] || null, lang);
}

/** The exams shown on the chooser, in the order they should appear. */
export const EXAM_ORDER = ["uptet", "ctet", "up-tgt-pgt", "mp-police"];

export function listExams(lang) {
  return EXAM_ORDER.map((id) => getExam(id, lang)).filter(Boolean);
}
