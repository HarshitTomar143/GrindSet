/**
 * The copy shown *around* a question bank's questions — topic lists, mock
 * lists, the quiz screen — in the two languages the app reads in.
 *
 * A bank section can set `uiLang: "hi"` to have its own pages read entirely in
 * Hindi; everything else stays in English. Question text is separate: it is
 * bilingual in the data and switched by the reader with lib/lang.js.
 *
 * Counts are functions so each language keeps its own rules — English needs the
 * plural "s", Hindi does not.
 */

const EN = {
  // shared
  home: "Home",
  mockPapers: "Mock papers",
  topicsWord: "Topics",
  subjectsWord: "Subjects",
  groupCount: (n) => `${n} sections`,
  topicCount: (n) => `${n} topic${n === 1 ? "" : "s"}`,
  subjectCount: (n) => `${n} subject${n === 1 ? "" : "s"}`,
  openSection: "Open section →",
  questionCount: (n) => `${n} question${n === 1 ? "" : "s"}`,
  mockCount: (n) => `${n} mock paper${n === 1 ? "" : "s"}`,

  // section page
  subGrouped:
    "The syllabus, section by section. Pick a topic to see its mock papers.",
  subTopics:
    "Each topic comes from its own question set. Pick one to see its mock papers.",
  subSubjects: "Pick a subject to see its mock papers.",
  emptyPre: "Nothing loaded for this section yet. Run",
  emptyPost: "to seed it.",

  // topic page
  topicSub: (total, mocks) =>
    `${total} question${total === 1 ? "" : "s"} · ${mocks} mock paper${
      mocks === 1 ? "" : "s"
    }. Each paper is scored at the end.`,
  mockPaper: (n) => `Mock Paper ${n}`,
  mockShort: (n) => `Mock ${n}`,
  startTest: "Start test →",

  // quiz screen: the gate
  language: "Language",
  languageAria: "Question language",
  both: "Both",
  beforeBegin: "Before you begin",
  gateSub: (subject, mock, n) =>
    `${subject} · Mock Paper ${mock} · ${n} question${n === 1 ? "" : "s"}`,
  gateSections: (sections, n) =>
    `This mock has ${sections} sections and ${n} questions.`,
  gateScored: (n) => `${n} questions, scored as soon as you submit.`,
  chooseMode: "Choose a mode",
  examMode: "📝 Exam mode",
  examModeDesc: (n) =>
    `${n}-minute timer that auto-submits when time is up. Score & review at the end — like the real CBT.`,
  practiceMode: "📚 Practice mode",
  practiceModeDesc:
    "Untimed. See the correct answer and explanation right after each question.",
  yourName: "Your name *",
  namePlaceholder: "e.g. Priya Sharma",
  emailOptional: "Email (optional)",
  startPractice: "Start practice →",

  // quiz screen: confirmations
  confirmUnanswered: (n) => `You have ${n} unanswered question(s). Submit anyway?`,
  confirmSubmit: "Submit your answers?",
  confirmLeave: "Leave this test? Your answers will be lost.",

  // quiz screen: reporting a question
  reportReasons: [
    "Wrong answer marked",
    "Typo or unclear wording",
    "Bad / missing options",
    "Duplicate question",
    "Other",
  ],
  reportTitle: (n) => `Report question ${n}`,
  reportSub: "Tell us what looks wrong — it goes to the admin for review.",
  reportThanks: "✓ Thanks! Your report was submitted.",
  reportNotePlaceholder: "Add details (optional)…",
  reportError: "Could not submit — please try again.",
  reportSend: "Submit report",
  sending: "Sending…",
  close: "Close",
  cancel: "Cancel",
  report: "⚐ Report",

  // quiz screen: the report card
  reportCard: "Report Card",
  timeLabel: "time",
  autoSubmitted: " · ⏱ auto-submitted (time up)",
  saving: " · saving result…",
  saved: " · ✓ result saved",
  saveFailed: " · ⚠ result not saved",
  pctCorrect: (pct) => `${pct}% correct`,
  correct: "Correct",
  wrong: "Wrong",
  unattempted: "Unattempted",
  skipped: "Skipped",
  otherMocks: "Other mock papers",
  review: "Review",
  explanation: "Explanation:",

  // quiz screen: the paper itself
  examBadge: "Exam",
  practiceBadge: "Practice",
  answeredLabel: "Answered",
  qShort: "Q",
  changeUser: "(change)",
  submitTest: "Submit test",
  questionOf: (i, n) => `Question ${i}/${n}`,
  marked: "★ Marked",
  markForReview: "☆ Mark for review",
  correctFeedback: "✓ Correct!",
  wrongFeedback: (letter) => `✗ Incorrect — the correct answer is ${letter}.`,
  previous: "← Previous",
  next: "Next →",
  legendNotVisited: "Not visited",
  legendNotAnswered: "Not answered",
  legendAnswered: "Answered",
  legendMarked: "Marked for review",
};

const HI = {
  // shared
  home: "मुख्य पृष्ठ",
  mockPapers: "मॉक पेपर",
  topicsWord: "अध्याय",
  subjectsWord: "विषय",
  groupCount: (n) => `${n} इकाइयाँ`,
  topicCount: (n) => `${n} अध्याय`,
  subjectCount: (n) => `${n} विषय`,
  openSection: "इकाइयाँ देखें →",
  questionCount: (n) => `${n} प्रश्न`,
  mockCount: (n) => `${n} मॉक पेपर`,

  // section page
  subGrouped: "पाठ्यक्रम, इकाई दर इकाई। मॉक पेपर देखने के लिए कोई अध्याय चुनें।",
  subTopics:
    "हर अध्याय का अपना प्रश्न-संग्रह है। मॉक पेपर देखने के लिए कोई एक चुनें।",
  subSubjects: "मॉक पेपर देखने के लिए कोई विषय चुनें।",
  emptyPre: "इस अनुभाग में अभी कुछ लोड नहीं हुआ है। इसे भरने के लिए",
  emptyPost: "चलाएँ।",

  // topic page
  topicSub: (total, mocks) =>
    `${total} प्रश्न · ${mocks} मॉक पेपर। हर पेपर जमा करते ही जाँचा जाता है।`,
  mockPaper: (n) => `मॉक पेपर ${n}`,
  mockShort: (n) => `मॉक ${n}`,
  startTest: "टेस्ट शुरू करें →",

  // quiz screen: the gate
  language: "भाषा",
  languageAria: "प्रश्न की भाषा",
  both: "दोनों",
  beforeBegin: "शुरू करने से पहले",
  gateSub: (subject, mock, n) => `${subject} · मॉक पेपर ${mock} · ${n} प्रश्न`,
  gateSections: (sections, n) => `इस मॉक में ${sections} अनुभाग और ${n} प्रश्न हैं।`,
  gateScored: (n) => `${n} प्रश्न, जमा करते ही जाँच।`,
  chooseMode: "मोड चुनें",
  examMode: "📝 परीक्षा मोड",
  examModeDesc: (n) =>
    `${n} मिनट का टाइमर, समय पूरा होते ही अपने आप जमा। अंत में स्कोर और समीक्षा — असली CBT जैसा।`,
  practiceMode: "📚 अभ्यास मोड",
  practiceModeDesc: "बिना समय-सीमा। हर प्रश्न के तुरंत बाद सही उत्तर और व्याख्या।",
  yourName: "आपका नाम *",
  namePlaceholder: "जैसे प्रिया शर्मा",
  emailOptional: "ईमेल (वैकल्पिक)",
  startPractice: "अभ्यास शुरू करें →",

  // quiz screen: confirmations
  confirmUnanswered: (n) => `${n} प्रश्न अनुत्तरित हैं। फिर भी जमा करें?`,
  confirmSubmit: "अपने उत्तर जमा करें?",
  confirmLeave: "यह टेस्ट छोड़ दें? आपके उत्तर मिट जाएँगे।",

  // quiz screen: reporting a question
  reportReasons: [
    "गलत उत्तर चिह्नित है",
    "वर्तनी या भाषा अस्पष्ट है",
    "विकल्प गलत या अधूरे हैं",
    "प्रश्न दोहराया गया है",
    "अन्य",
  ],
  reportTitle: (n) => `प्रश्न ${n} की रिपोर्ट करें`,
  reportSub: "बताइए क्या गलत लग रहा है — यह समीक्षा के लिए एडमिन तक जाता है।",
  reportThanks: "✓ धन्यवाद! आपकी रिपोर्ट भेज दी गई।",
  reportNotePlaceholder: "विवरण जोड़ें (वैकल्पिक)…",
  reportError: "भेजी नहीं जा सकी — कृपया फिर कोशिश करें।",
  reportSend: "रिपोर्ट भेजें",
  sending: "भेजी जा रही है…",
  close: "बंद करें",
  cancel: "रद्द करें",
  report: "⚐ रिपोर्ट",

  // quiz screen: the report card
  reportCard: "रिपोर्ट कार्ड",
  timeLabel: "समय",
  autoSubmitted: " · ⏱ समय समाप्त, अपने आप जमा",
  saving: " · परिणाम सहेजा जा रहा है…",
  saved: " · ✓ परिणाम सहेजा गया",
  saveFailed: " · ⚠ परिणाम सहेजा नहीं जा सका",
  pctCorrect: (pct) => `${pct}% सही`,
  correct: "सही",
  wrong: "गलत",
  unattempted: "अनुत्तरित",
  skipped: "छोड़ा गया",
  otherMocks: "अन्य मॉक पेपर",
  review: "समीक्षा",
  explanation: "व्याख्या:",

  // quiz screen: the paper itself
  examBadge: "परीक्षा",
  practiceBadge: "अभ्यास",
  answeredLabel: "उत्तर दिए",
  qShort: "प्र.",
  changeUser: "(बदलें)",
  submitTest: "टेस्ट जमा करें",
  questionOf: (i, n) => `प्रश्न ${i}/${n}`,
  marked: "★ चिह्नित",
  markForReview: "☆ समीक्षा हेतु चिह्नित करें",
  correctFeedback: "✓ सही!",
  wrongFeedback: (letter) => `✗ गलत — सही उत्तर ${letter} है।`,
  previous: "← पिछला",
  next: "अगला →",
  legendNotVisited: "नहीं देखा",
  legendNotAnswered: "उत्तर नहीं दिया",
  legendAnswered: "उत्तर दिया",
  legendMarked: "समीक्षा हेतु चिह्नित",
};

/** The copy for one language; anything other than "hi" reads in English. */
export function uiText(lang) {
  return lang === "hi" ? HI : EN;
}
