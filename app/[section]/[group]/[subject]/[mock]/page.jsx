import { notFound } from "next/navigation";
import {
  getManifest,
  findSection,
  findGroup,
  findSubject,
  getMockQuestions,
  getFullMockQuestions,
} from "@/lib/data";
import QuizRunner from "@/components/QuizRunner";
import { getExam } from "@/lib/exams";
import { uiFormat } from "@/lib/ui-text";
import { bi } from "@/lib/site-lang";
import { getSiteLang } from "@/lib/site-lang-server";
import { getAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FULL_MOCK_SUBJECTS = { paper1: "paper1-full", paper2: "paper2-full" };

export default async function UptetMockPage({ params, searchParams }) {
  const mockNum = parseInt(params.mock, 10);
  if (!Number.isInteger(mockNum) || mockNum < 1) notFound();

  const lang = getSiteLang();
  const isFull = FULL_MOCK_SUBJECTS[params.section] === params.subject;
  const language = searchParams?.lang === "sanskrit" ? "sanskrit" : "english";
  const stream = searchParams?.stream === "social" ? "social" : "science";

  const manifest = await getManifest();
  const section = findSection(manifest, params.section);
  const group = findGroup(section, params.group);
  const subject = isFull ? null : findSubject(group, params.subject);
  if (!section || !group || (!subject && !isFull)) notFound();

  const questions = isFull
    ? await getFullMockQuestions(params.section, mockNum, { language, stream, lang })
    : await getMockQuestions(params.section, params.group, params.subject, mockNum);
  if (!questions.length) notFound();

  const base = `/${params.section}/${params.group}/${params.subject}`;
  const exam = getExam("uptet");

  return (
    <QuizRunner
      questions={questions}
      mockNum={mockNum}
      account={await getAccount()}
      meta={{
        uiLang: lang,
        examId: "uptet",
        examLogo: exam?.logo || null,
        examName: "UP TET",
        examBase: "/uptet",
        passMark: exam?.cutoff?.general ?? 60,
        // The full-mock page offers exactly three papers.
        mockCount: isFull ? 3 : subject.mocks,
        sectionName: bi(lang, section.name, section.nameHi, true),
        groupName: bi(lang, group.name, group.nameHi, true),
        subjectName: isFull
          ? uiFormat(lang, "fullMockName", [section.name], [section.nameHi || section.name])
          : bi(lang, subject.name, subject.nameHi, true),
        multiGroup: section.groups.length > 1,
        base,
        groupBase: `/${params.section}/${params.group}`,
        sectionBase: `/${params.section}`,
      }}
      submitMeta={{
        sectionId: params.section,
        groupId: params.group,
        subjectId: params.subject,
        // Saved results keep English names whatever the reader sees, so the
        // admin dashboard reads in one language.
        sectionName: section.name,
        groupName: group.name,
        subjectName: isFull ? `${section.name} Full Mock` : subject.name,
      }}
    />
  );
}
