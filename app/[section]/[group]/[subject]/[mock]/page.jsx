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

export const dynamic = "force-dynamic";

const FULL_MOCK_SUBJECTS = { paper1: "paper1-full", paper2: "paper2-full" };

export default async function UptetMockPage({ params, searchParams }) {
  const mockNum = parseInt(params.mock, 10);
  if (!Number.isInteger(mockNum) || mockNum < 1) notFound();

  const isFull = FULL_MOCK_SUBJECTS[params.section] === params.subject;
  const language = searchParams?.lang === "sanskrit" ? "sanskrit" : "english";
  const stream = searchParams?.stream === "social" ? "social" : "science";

  const manifest = await getManifest();
  const section = findSection(manifest, params.section);
  const group = findGroup(section, params.group);
  const subject = isFull ? null : findSubject(group, params.subject);
  if (!section || !group || (!subject && !isFull)) notFound();

  const questions = isFull
    ? await getFullMockQuestions(params.section, mockNum, { language, stream })
    : await getMockQuestions(params.section, params.group, params.subject, mockNum);
  if (!questions.length) notFound();

  const base = `/${params.section}/${params.group}/${params.subject}`;

  return (
    <QuizRunner
      questions={questions}
      mockNum={mockNum}
      meta={{
        examName: "UP TET",
        examBase: "/uptet",
        sectionName: section.name,
        groupName: group.name,
        subjectName: isFull ? `${section.name} Full Mock` : subject.name,
        multiGroup: section.groups.length > 1,
        base,
        groupBase: `/${params.section}/${params.group}`,
        sectionBase: `/${params.section}`,
      }}
      submitMeta={{
        sectionId: params.section,
        groupId: params.group,
        subjectId: params.subject,
      }}
    />
  );
}
