import { notFound } from "next/navigation";
import {
  findSection,
  findTopic,
  getMockQuestions,
  topicLabel,
} from "@/lib/banks";
import QuizRunner from "@/components/QuizRunner";

// One mock paper, handed to the shared quiz runner.

export default async function BankMock({ bank, sectionId, topicId, mock }) {
  const mockNum = parseInt(mock, 10);
  if (!Number.isInteger(mockNum) || mockNum < 1) notFound();

  const section = findSection(bank, sectionId);
  if (!section) notFound();
  const topic = await findTopic(section, topicId);
  if (!topic || mockNum > topic.mocks) notFound();

  const questions = await getMockQuestions(section, topic, mockNum);
  if (!questions.length) notFound();

  const base = `${bank.base}/${section.id}/${topic.id}`;

  return (
    <QuizRunner
      questions={questions}
      mockNum={mockNum}
      meta={{
        examName: bank.name,
        examBase: bank.base,
        sectionName: `${bank.name} · ${section.name}`,
        groupName: section.kind === "topic" ? "Topics" : "Subjects",
        subjectName: topicLabel(topic),
        multiGroup: false,
        base,
        groupBase: `${bank.base}/${section.id}`,
        sectionBase: `${bank.base}/${section.id}`,
      }}
      submitMeta={{
        // Prefixed per bank so results stay distinguishable from UPTET ones
        // in the admin dashboard, which keys on these ids.
        sectionId: `${bank.resultPrefix}-${section.id}`,
        groupId: bank.resultPrefix,
        subjectId: topic.id,
      }}
    />
  );
}
