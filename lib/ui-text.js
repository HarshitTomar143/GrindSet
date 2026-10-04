import { bi, joinBi } from "./site-lang";

/**
 * The copy shown around the questions — every page's headings, buttons and
 * card text — in the site's three reading modes: Hindi (the default), English,
 * or both together.
 *
 * The reader picks the mode with the header switch; see lib/site-lang.js.
 * Question text is separate: it is bilingual in the data and switched on the
 * quiz screen with lib/lang.js.
 *
 * Counts are functions so each language keeps its own rules — English needs the
 * plural "s", Hindi does not. The `w…` functions return the word alone, for the
 * places a count is printed in bold beside it.
 */

const nf = (n) => Number(n).toLocaleString("en-IN");
const plural = (n, one, many) => (n === 1 ? one : many);

const EN = {
  // site chrome
  brandSub: "Teaching exam practice",
  footerLine:
    "Mock papers of 30 questions, scored at the end, with an explanation for every answer.",
  admin: "Admin",
  siteLanguage: "Site language",
  textSize: (size) => `Text size: ${size}`,
  fontSizes: ["Small", "Normal", "Large", "Extra large"],
  toDark: "Switch to dark mode",
  toLight: "Switch to light mode",

  // shared
  home: "Home",
  exams: "Exams",
  mockPapers: "Mock papers",
  figure: "Figure for this question",
  topicsWord: "Topics",
  subjectsWord: "Subjects",
  groupCount: (n) => `${nf(n)} ${plural(n, "section", "sections")}`,
  topicCount: (n) => `${nf(n)} ${plural(n, "topic", "topics")}`,
  subjectCount: (n) => `${nf(n)} ${plural(n, "subject", "subjects")}`,
  openSection: "Open section →",
  questionCount: (n) => `${nf(n)} ${plural(n, "question", "questions")}`,
  mockCount: (n) => `${nf(n)} ${plural(n, "mock paper", "mock papers")}`,

  // the word alone, for "<b>30</b> questions"
  wQuestions: (n) => plural(n, "question", "questions"),
  wMocks: (n) => plural(n, "mock paper", "mock papers"),
  wSubjects: (n) => plural(n, "subject", "subjects"),
  wTopics: (n) => plural(n, "topic", "topics"),
  wPapers: (n) => plural(n, "paper", "papers"),
  wStreams: (n) => plural(n, "stream", "streams"),
  wUnits: (n) => plural(n, "section", "sections"),

  // home
  heroEyebrow: "Teaching exam preparation",
  heroTitle: "Practise the paper you are actually going to sit.",
  heroSub:
    "Previous-year question banks for teaching and police recruitment exams, split into mock papers that are timed like the real computer-based test and scored the moment you submit — with the explanation for every question.",
  statQuestions: "Questions",
  statMocks: "Mock papers",
  statExams: "Exams",
  chooseExam: "Choose your exam",
  startPractising: "Start practising →",
  disclaimerLead: "Not an official exam portal.",
  disclaimerBody:
    "This is an independent practice app built from previous-year papers. Exam bodies' emblems are shown only to identify each exam. Always confirm the pattern, syllabus and dates against the conducting body's own notification.",

  // home: where you left off
  carryOn: "Carry on where you stopped",
  recentlyScored: "Recently scored",
  answeredOf: (answered, total) => `${answered} of ${total} answered`,
  resumeBtn: "Resume",
  discard: "Discard",
  forgetAttempt: "Forget this attempt",
  justNow: "just now",
  minsAgo: (n) => `${n} min ago`,
  hoursAgo: (n) => `${n} ${plural(n, "hour", "hours")} ago`,
  daysAgo: (n) => `${n} ${plural(n, "day", "days")} ago`,

  // an exam's masthead
  qualifyingLabel: "Qualifying:",
  inThisApp: "In this app:",

  // UP TET: choosing a paper
  uptetSub:
    "Choose the paper level you are sitting. Each subject is split into mock papers of 30 questions, and each paper is timed and scored the way the real computer-based test is.",
  choosePaper: "Choose your paper",
  openPaper: "Open paper →",
  paper1Level: "Classes 1–5 · Primary level",
  paper2Level: "Classes 6–8 · Upper primary level",
  paper1Blurb:
    "For candidates who want to teach at the primary level. Child Development & Pedagogy, Language I, Language II, Mathematics and Environmental Studies.",
  paper2Blurb:
    "For candidates who want to teach at the upper primary level. Child Development & Pedagogy, the languages, plus Mathematics & Science or Social Studies.",
  tetFacts: ["150 questions", "150 marks", "2½ hours", "No negative marking"],

  // UP TET: inside a paper
  sectionSub: (subjects, questions) =>
    `${subjects} ${plural(subjects, "subject", "subjects")} · ${nf(questions)} questions. Pick a subject for 30-question papers, or sit a full-length mock.`,
  fullMockEyebrow: "Full-length mock",
  fullMockTitle: (paper) => `${paper} · 150-question mock papers`,
  fullMockBlurb1:
    "Three full-length papers of 150 questions across five sections, in the order the real Paper 1 runs them. Choose English or Sanskrit as your second language.",
  fullMockBlurb2:
    "Three full-length papers of 150 questions: Child Development & Pedagogy, Hindi, your language section, then 60 from your chosen stream.",
  fullMockFacts: ["150 questions", "2½ hours", "Real paper order"],
  startFullMock: "Start a full mock →",
  subjectWise: "Subject-wise papers",
  chooseStream: "Choose the stream you are sitting.",
  streamEyebrow: "Stream",
  openStream: "Open stream →",

  // UP TET: the full-mock chooser
  fullMocksCrumb: "Full mock papers",
  fullMocksTitle: (paper) => `${paper} Full Mock Papers`,
  fullMocksSub1:
    "Pick a language and start a full Paper 1 mock paper with 150 questions across five sections: Child Development & Pedagogy, Hindi, your chosen third section, Environmental Studies, and Mathematics.",
  fullMocksSub2:
    "Pick your stream and language, then start a full Paper 2 mock paper with 150 questions: 30 from CDP, 30 from Hindi, 30 from English or Sanskrit, and 60 from the chosen stream.",
  fullMockN: (n) => `Full Mock Paper ${n}`,
  fullMockSplit1: "150 questions · 30 from each section",
  fullMockSplit2: "150 questions · 30 + 30 + 30 + 60",
  chooseThird: "Choose the third section",
  chooseStreamLabel: "Choose stream",
  chooseLanguageSection: "Choose the language section",
  hindiMandatory: "Hindi is always included as a mandatory section.",
  startMockN: (n) => `Start Mock Paper ${n} →`,
  fullMockName: (paper) => `${paper} Full Mock`,

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
    `${nf(total)} ${plural(total, "question", "questions")} · ${nf(mocks)} ${plural(
      mocks,
      "mock paper",
      "mock papers"
    )}. Each paper is scored at the end.`,
  mockPaper: (n) => `Mock Paper ${n}`,
  mockShort: (n) => `Mock ${n}`,
  startTest: "Start test →",

  // quiz screen: the gate
  language: "Question language",
  languageAria: "Question language",
  both: "Both",
  beforeBegin: "Before you begin",
  gateSub: (subject, mock, n) =>
    `${subject} · Mock Paper ${mock} · ${n} ${plural(n, "question", "questions")}`,
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

  // quiz screen: leaving, and the summary shown before submitting
  confirmLeave:
    "Leave this paper? Your answers stay saved in this browser, so you can resume it later.",
  submitTitle: "Submit this paper?",
  submitTimeLeft: (t) =>
    `${t} still on the clock. Answers cannot be changed once submitted.`,
  submitTimeTaken: (t) =>
    `Time taken ${t}. Answers cannot be changed once submitted.`,
  submitUnanswered: (n) =>
    `${n} question${n === 1 ? " is" : "s are"} still unanswered.`,
  submitAllAnswered: "Every question has an answer.",
  sectionCol: "Section",
  backToPaper: "Back to paper",
  submitFinal: "Submit paper",

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

  // mock paper list: what this reader has already done with each paper
  inProgress: "In progress",
  resume: "Resume →",
  retake: "Retake →",

  // quiz screen: resuming an unfinished paper
  resumeTitle: "You left this paper unfinished",
  resumeBody: (answered, total) =>
    `${answered} of ${total} answers are still saved in this browser.`,
  resumeContinue: "Continue this attempt",
  resumeRestart: "Start again",

  // quiz screen: the CBT panel
  candidateLabel: "Candidate",
  paletteTitle: "Question palette",
  summaryAnswered: "Answered",
  summaryNotAnswered: "Not answered",
  summaryNotVisited: "Not visited",
  summaryMarked: "Marked",
  saveAndNext: "Save & Next",
  clearResponse: "Clear response",
  markAndNext: "Mark & Next",
  timeLeft: "Time left",
  timeTaken: "Time taken",
  shortcutsHint: "Press 1–4 to answer · ← → to move · M to mark",
  autoSaved: "Answers are saved in this browser as you go.",

  // report card: how the attempt actually went
  accuracy: "Accuracy",
  accuracyNote: (n) => `of the ${n} you attempted`,
  attempted: "Attempted",
  perQuestion: "Per question",
  qualified: (mark) => `Above the ${mark}% qualifying mark`,
  notQualified: (pct, mark) => `${pct}% — below the ${mark}% qualifying mark`,
  sectionBreakdown: "Section by section",
  reviewWrongOnly: "Only wrong & skipped",
  reviewAll: "All questions",
  nothingToReview: "Nothing to show with this filter.",
  retakePaper: "Retake this paper",
  nextMock: (n) => `Mock Paper ${n} →`,
};

const HI = {
  // site chrome
  brandSub: "शिक्षक परीक्षा अभ्यास",
  footerLine: "30 प्रश्नों के मॉक पेपर, अंत में जाँच, हर उत्तर की व्याख्या के साथ।",
  admin: "एडमिन",
  siteLanguage: "साइट की भाषा",
  textSize: (size) => `अक्षरों का आकार: ${size}`,
  fontSizes: ["छोटा", "सामान्य", "बड़ा", "बहुत बड़ा"],
  toDark: "डार्क मोड चालू करें",
  toLight: "लाइट मोड चालू करें",

  // shared
  home: "मुख्य पृष्ठ",
  exams: "परीक्षाएँ",
  mockPapers: "मॉक पेपर",
  figure: "इस प्रश्न की आकृति",
  topicsWord: "अध्याय",
  subjectsWord: "विषय",
  groupCount: (n) => `${nf(n)} ${plural(n, "इकाई", "इकाइयाँ")}`,
  topicCount: (n) => `${nf(n)} अध्याय`,
  subjectCount: (n) => `${nf(n)} विषय`,
  openSection: "खोलें →",
  questionCount: (n) => `${nf(n)} प्रश्न`,
  mockCount: (n) => `${nf(n)} मॉक पेपर`,

  // the word alone
  wQuestions: () => "प्रश्न",
  wMocks: () => "मॉक पेपर",
  wSubjects: () => "विषय",
  wTopics: () => "अध्याय",
  wPapers: () => "पेपर",
  wStreams: () => "वर्ग",
  wUnits: (n) => plural(n, "इकाई", "इकाइयाँ"),

  // home
  heroEyebrow: "शिक्षक परीक्षा की तैयारी",
  heroTitle: "वही पेपर हल कीजिए, जो आप परीक्षा में देने जा रहे हैं।",
  heroSub:
    "शिक्षक और पुलिस भर्ती परीक्षाओं के विगत वर्षों के प्रश्न, मॉक पेपरों में बँटे हुए — असली कंप्यूटर आधारित परीक्षा की तरह समयबद्ध, जमा करते ही जाँचे जाते हैं, और हर प्रश्न की व्याख्या के साथ।",
  statQuestions: "प्रश्न",
  statMocks: "मॉक पेपर",
  statExams: "परीक्षाएँ",
  chooseExam: "अपनी परीक्षा चुनें",
  startPractising: "अभ्यास शुरू करें →",
  disclaimerLead: "यह आधिकारिक परीक्षा पोर्टल नहीं है।",
  disclaimerBody:
    "यह विगत वर्षों के प्रश्नपत्रों से बना एक स्वतंत्र अभ्यास ऐप है। परीक्षा संस्थाओं के प्रतीक-चिह्न केवल परीक्षा की पहचान के लिए दिखाए गए हैं। पैटर्न, पाठ्यक्रम और तिथियों की पुष्टि हमेशा संबंधित संस्था की आधिकारिक अधिसूचना से करें।",

  // home: where you left off
  carryOn: "जहाँ छोड़ा था, वहीं से जारी रखें",
  recentlyScored: "हाल के परिणाम",
  answeredOf: (answered, total) => `${total} में से ${answered} के उत्तर दिए`,
  resumeBtn: "जारी रखें",
  discard: "हटाएँ",
  forgetAttempt: "यह प्रयास हटा दें",
  justNow: "अभी-अभी",
  minsAgo: (n) => `${n} मिनट पहले`,
  hoursAgo: (n) => `${n} घंटे पहले`,
  daysAgo: (n) => `${n} दिन पहले`,

  // an exam's masthead
  qualifyingLabel: "अर्हता:",
  inThisApp: "इस ऐप में:",

  // UP TET: choosing a paper
  uptetSub:
    "जिस स्तर का पेपर आप दे रहे हैं, उसे चुनें। हर विषय 30 प्रश्नों के मॉक पेपरों में बँटा है, और हर पेपर असली कंप्यूटर आधारित परीक्षा की तरह समयबद्ध है और उसी तरह जाँचा जाता है।",
  choosePaper: "अपना पेपर चुनें",
  openPaper: "पेपर खोलें →",
  paper1Level: "कक्षा 1–5 · प्राथमिक स्तर",
  paper2Level: "कक्षा 6–8 · उच्च प्राथमिक स्तर",
  paper1Blurb:
    "प्राथमिक स्तर पर पढ़ाने के इच्छुक अभ्यर्थियों के लिए। बाल विकास एवं शिक्षाशास्त्र, भाषा I, भाषा II, गणित और पर्यावरण अध्ययन।",
  paper2Blurb:
    "उच्च प्राथमिक स्तर पर पढ़ाने के इच्छुक अभ्यर्थियों के लिए। बाल विकास एवं शिक्षाशास्त्र, भाषाएँ, साथ में गणित एवं विज्ञान या सामाजिक अध्ययन।",
  tetFacts: ["150 प्रश्न", "150 अंक", "2½ घंटे", "कोई ऋणात्मक अंकन नहीं"],

  // UP TET: inside a paper
  sectionSub: (subjects, questions) =>
    `${subjects} विषय · ${nf(questions)} प्रश्न। 30 प्रश्नों के पेपर के लिए कोई विषय चुनें, या पूरा मॉक पेपर दें।`,
  fullMockEyebrow: "पूर्ण मॉक",
  fullMockTitle: (paper) => `${paper} · 150 प्रश्नों के मॉक पेपर`,
  fullMockBlurb1:
    "पाँच अनुभागों में 150 प्रश्नों के तीन पूर्ण पेपर, उसी क्रम में जैसे असली पेपर 1 चलता है। दूसरी भाषा के रूप में अंग्रेज़ी या संस्कृत चुनें।",
  fullMockBlurb2:
    "150 प्रश्नों के तीन पूर्ण पेपर: बाल विकास एवं शिक्षाशास्त्र, हिन्दी, आपका भाषा अनुभाग, फिर आपके चुने हुए वर्ग से 60 प्रश्न।",
  fullMockFacts: ["150 प्रश्न", "2½ घंटे", "असली पेपर का क्रम"],
  startFullMock: "पूर्ण मॉक शुरू करें →",
  subjectWise: "विषयवार पेपर",
  chooseStream: "वह वर्ग चुनें जिसकी परीक्षा आप दे रहे हैं।",
  streamEyebrow: "वर्ग",
  openStream: "वर्ग खोलें →",

  // UP TET: the full-mock chooser
  fullMocksCrumb: "पूर्ण मॉक पेपर",
  fullMocksTitle: (paper) => `${paper} के पूर्ण मॉक पेपर`,
  fullMocksSub1:
    "भाषा चुनें और पेपर 1 का पूर्ण मॉक शुरू करें — पाँच अनुभागों में 150 प्रश्न: बाल विकास एवं शिक्षाशास्त्र, हिन्दी, आपका चुना हुआ तीसरा अनुभाग, पर्यावरण अध्ययन और गणित।",
  fullMocksSub2:
    "अपना वर्ग और भाषा चुनें, फिर पेपर 2 का पूर्ण मॉक शुरू करें — 150 प्रश्न: 30 बाल विकास से, 30 हिन्दी से, 30 अंग्रेज़ी या संस्कृत से, और 60 चुने हुए वर्ग से।",
  fullMockN: (n) => `पूर्ण मॉक पेपर ${n}`,
  fullMockSplit1: "150 प्रश्न · हर अनुभाग से 30",
  fullMockSplit2: "150 प्रश्न · 30 + 30 + 30 + 60",
  chooseThird: "तीसरा अनुभाग चुनें",
  chooseStreamLabel: "वर्ग चुनें",
  chooseLanguageSection: "भाषा अनुभाग चुनें",
  hindiMandatory: "हिन्दी अनिवार्य अनुभाग के रूप में हमेशा शामिल रहती है।",
  startMockN: (n) => `मॉक पेपर ${n} शुरू करें →`,
  fullMockName: (paper) => `${paper} पूर्ण मॉक`,

  // section page
  subGrouped: "पाठ्यक्रम, इकाई दर इकाई। मॉक पेपर देखने के लिए कोई अध्याय चुनें।",
  subTopics:
    "हर अध्याय का अपना प्रश्न-संग्रह है। मॉक पेपर देखने के लिए कोई एक चुनें।",
  subSubjects: "मॉक पेपर देखने के लिए कोई विषय चुनें।",
  emptyPre: "इस अनुभाग में अभी कुछ लोड नहीं हुआ है। इसे भरने के लिए",
  emptyPost: "चलाएँ।",

  // topic page
  topicSub: (total, mocks) =>
    `${nf(total)} प्रश्न · ${nf(mocks)} मॉक पेपर। हर पेपर जमा करते ही जाँचा जाता है।`,
  mockPaper: (n) => `मॉक पेपर ${n}`,
  mockShort: (n) => `मॉक ${n}`,
  startTest: "टेस्ट शुरू करें →",

  // quiz screen: the gate
  language: "प्रश्नों की भाषा",
  languageAria: "प्रश्नों की भाषा",
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

  // quiz screen: leaving, and the summary shown before submitting
  confirmLeave:
    "यह पेपर छोड़ें? आपके उत्तर इसी ब्राउज़र में सहेजे रहेंगे, बाद में जारी रख सकते हैं।",
  submitTitle: "यह पेपर जमा करें?",
  submitTimeLeft: (t) =>
    `अभी ${t} समय शेष है। जमा करने के बाद उत्तर बदले नहीं जा सकते।`,
  submitTimeTaken: (t) =>
    `लगा समय ${t}। जमा करने के बाद उत्तर बदले नहीं जा सकते।`,
  submitUnanswered: (n) => `${n} प्रश्न अभी अनुत्तरित हैं।`,
  submitAllAnswered: "सभी प्रश्नों के उत्तर दिए जा चुके हैं।",
  sectionCol: "अनुभाग",
  backToPaper: "पेपर पर लौटें",
  submitFinal: "पेपर जमा करें",

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

  // mock paper list: what this reader has already done with each paper
  inProgress: "जारी है",
  resume: "जारी रखें →",
  retake: "फिर से दें →",

  // quiz screen: resuming an unfinished paper
  resumeTitle: "यह पेपर अधूरा छूटा था",
  resumeBody: (answered, total) =>
    `${total} में से ${answered} उत्तर इसी ब्राउज़र में सहेजे हुए हैं।`,
  resumeContinue: "इसी प्रयास को जारी रखें",
  resumeRestart: "फिर से शुरू करें",

  // quiz screen: the CBT panel
  candidateLabel: "परीक्षार्थी",
  paletteTitle: "प्रश्न सूची",
  summaryAnswered: "उत्तर दिए",
  summaryNotAnswered: "उत्तर नहीं दिया",
  summaryNotVisited: "नहीं देखा",
  summaryMarked: "चिह्नित",
  saveAndNext: "सहेजें और अगला",
  clearResponse: "उत्तर हटाएँ",
  markAndNext: "चिह्नित कर अगला",
  timeLeft: "शेष समय",
  timeTaken: "लगा समय",
  shortcutsHint: "उत्तर के लिए 1–4 · आगे-पीछे ← → · चिह्नित करने को M",
  autoSaved: "आपके उत्तर इसी ब्राउज़र में अपने आप सहेजे जा रहे हैं।",

  // report card: how the attempt actually went
  accuracy: "शुद्धता",
  accuracyNote: (n) => `आपके ${n} प्रयासों में से`,
  attempted: "प्रयास किए",
  perQuestion: "प्रति प्रश्न",
  qualified: (mark) => `${mark}% अर्हक अंक से ऊपर`,
  notQualified: (pct, mark) => `${pct}% — ${mark}% अर्हक अंक से नीचे`,
  sectionBreakdown: "अनुभाग दर अनुभाग",
  reviewWrongOnly: "केवल गलत और छोड़े हुए",
  reviewAll: "सभी प्रश्न",
  nothingToReview: "इस छँटनी में दिखाने को कुछ नहीं।",
  retakePaper: "यह पेपर फिर दें",
  nextMock: (n) => `मॉक पेपर ${n} →`,
};

/** "Both": every entry is the Hindi and English versions joined (joinBi). */
function buildBoth() {
  const out = {};
  for (const key of Object.keys(EN)) {
    const en = EN[key];
    const hi = HI[key];
    if (typeof en === "function") {
      out[key] = (...args) => joinBi(hi ? hi(...args) : "", en(...args));
    } else if (Array.isArray(en)) {
      out[key] = en.map((e, i) => joinBi(hi?.[i], e, true));
    } else {
      out[key] = joinBi(hi, en);
    }
  }
  return out;
}

const BOTH = buildBoth();

// Where joining two whole strings would print a name twice, or overflow the
// small control it sits in.
Object.assign(BOTH, {
  both: "हिं+EN",
  submitTest: "जमा करें / Submit",
  fullMockSplit1: "150 प्रश्न / questions · 30 × 5",
  fullMockSplit2: "150 प्रश्न / questions · 30 + 30 + 30 + 60",
  gateSub: (subject, mock, n) =>
    `${subject} · ${BOTH.mockPaper(mock)} · ${BOTH.questionCount(n)}`,
});

/** The copy for one site language: "hi" (default), "en" or "both". */
export function uiText(lang) {
  if (lang === "en") return EN;
  if (lang === "both") return BOTH;
  return HI;
}

/**
 * For copy that embeds a name which itself differs by language — "Paper 1
 * Full Mock" vs "पेपर 1 पूर्ण मॉक" — so "both" does not print the name twice.
 */
export function uiFormat(lang, key, enArgs = [], hiArgs = enArgs) {
  const run = (v, args) => (typeof v === "function" ? v(...args) : v);
  return bi(lang, run(EN[key], enArgs), run(HI[key], hiArgs));
}
