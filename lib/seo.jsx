import { findBank, findSection, findTopic } from "./banks";
import { getManifest, findSection as findUptetSection, findGroup, findSubject } from "./data";
import { SITE_URL, absoluteUrl } from "./site-url";

/**
 * Titles and descriptions for search results and link previews.
 *
 * They are written once, in English, whatever the visitor's site language: a
 * crawler arrives without the language cookie, and people search for these
 * exams by their English names ("UP TET mock test") even when they study in
 * Hindi. The descriptions say the papers are in Hindi too.
 *
 * Every title gets " · PYQSetu" from the template in app/layout.jsx.
 */

export const SITE_NAME = "PYQSetu";
export const SITE_TAGLINE = "Government exam practice";
export const SITE_DESCRIPTION =
  "Mock tests built from previous-year questions for government exams — UP TET, CTET, UP TGT / PGT and MP Police — in Hindi and English, timed like the real CBT and scored the moment you submit.";

const EXAM_SEO = {
  uptet: {
    title: "UP TET Mock Test & Previous Year Questions",
    description:
      "UP TET mock tests from previous-year questions — Paper 1 and Paper 2, subject-wise and full 150-question papers, in Hindi and English, with an explanation for every answer.",
  },
  ctet: {
    title: "CTET Mock Test & Previous Year Questions",
    description:
      "CTET mock tests from previous-year questions — Paper 1 and Paper 2 (Science and Social Studies), subject by subject, in Hindi and English, with explanations.",
  },
  "up-tgt-pgt": {
    title: "UP TGT / PGT Mock Test & Previous Year Questions",
    description:
      "UP TGT and PGT mock tests from previous-year questions, laid out by syllabus unit and topic, in Hindi and English, scored instantly with explanations.",
  },
  "mp-police": {
    title: "MP Police Constable Previous Year Papers & Mock Test",
    description:
      "MP Police Constable previous-year papers of 2023 and 2025, shift by shift with their diagrams, plus subject-wise mock tests — in Hindi and English, with explanations.",
  },
};

const PRACTICE_TAIL = "in Hindi and English, timed like the real exam and scored with explanations.";

// The preview card shown when a page is shared on WhatsApp, Telegram, X and
// the like. It sits on white because some apps paint transparency black.
const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "PYQSetu · Government exam practice for UP TET, CTET, UP TGT / PGT and MP Police",
};

// Next replaces openGraph and twitter whole rather than merging them with the
// layout's, so every page restates the fields that do not change.
export const OG_BASE = {
  type: "website",
  siteName: SITE_NAME,
  locale: "hi_IN",
  alternateLocale: ["en_IN"],
  url: "./",
  images: [OG_IMAGE],
};

export const TWITTER_BASE = { card: "summary_large_image", images: [OG_IMAGE.url] };

const meta = (title, description) => ({
  title,
  description,
  openGraph: { ...OG_BASE, title: `${title} · ${SITE_NAME}`, description },
  twitter: { ...TWITTER_BASE, title: `${title} · ${SITE_NAME}`, description },
});

/** "MP Police" + "Previous Year Papers", without repeating the exam name. */
const under = (examName, name) =>
  name.toLowerCase().startsWith(examName.toLowerCase()) ? name : `${examName} ${name}`;

export function examMetadata(examId) {
  const s = EXAM_SEO[examId];
  return s ? meta(s.title, s.description) : {};
}

export async function bankSectionMetadata(bankId, sectionId) {
  const bank = findBank(bankId);
  const section = bank && findSection(bank, sectionId);
  if (!section) return {};
  const title = under(bank.name, section.name);
  // "MP Police Previous Year Papers" already says what it is.
  const isPapers = /papers$/i.test(section.name);
  return meta(
    isPapers ? title : `${title} Mock Test`,
    `${title}: previous-year questions as mock papers, ${PRACTICE_TAIL}`
  );
}

export async function bankTopicMetadata(bankId, sectionId, topicId) {
  const bank = findBank(bankId);
  const section = bank && findSection(bank, sectionId);
  if (!section) return {};
  try {
    const topic = await findTopic(section, topicId);
    if (!topic) return {};
    const where = under(bank.name, section.name);
    const papers = topic.mocks === 1 ? "one full paper" : `${topic.mocks} mock papers`;
    return meta(
      `${topic.name} · ${where}`,
      `${topic.name} (${where}): ${topic.total} previous-year questions in ${papers}, ${PRACTICE_TAIL}`
    );
  } catch {
    return {};
  }
}

/** UP TET pages, which are read from the manifest rather than a bank. */
export async function uptetMetadata({ section: sectionId, group: groupId, subject: subjectId }) {
  try {
    const section = findUptetSection(await getManifest(), sectionId);
    if (!section) return {};
    const paper = `UP TET ${section.name}`;
    if (subjectId && subjectId.endsWith("-full")) {
      return meta(
        `${paper} Full Mock Test`,
        `Full-length 150-question ${paper} mock tests that follow the real paper, ${PRACTICE_TAIL}`
      );
    }
    const group = groupId && findGroup(section, groupId);
    if (subjectId) {
      const subject = group && findSubject(group, subjectId);
      if (!subject) return {};
      return meta(
        `${subject.name} · ${paper} Mock Test`,
        `${subject.name} for ${paper}: ${subject.total} previous-year questions in ${subject.mocks} mock papers, ${PRACTICE_TAIL}`
      );
    }
    if (group) {
      return meta(
        `${paper} ${group.name} Mock Test`,
        `${paper} ${group.name} practice, subject by subject, from previous-year questions — ${PRACTICE_TAIL}`
      );
    }
    return meta(
      `${paper} Mock Test`,
      `${paper} practice, subject by subject, from previous-year questions — ${PRACTICE_TAIL}`
    );
  } catch {
    return {};
  }
}

/** Who the site is, for search engines and AI answers that read schema.org. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl("/Updated.png"),
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        alternateName: ["PYQ Setu", "pyqsetu.in"],
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: ["hi-IN", "en-IN"],
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}

/** The breadcrumb trail as schema.org, so results can show it under the title. */
export function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      ...(it.href ? { item: absoluteUrl(it.href) } : {}),
    })),
  };
}

/** `<script type="application/ld+json">`, with "<" escaped so text cannot close it. */
export function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
