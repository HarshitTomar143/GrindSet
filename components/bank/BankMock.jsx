import { notFound } from "next/navigation";
import {
  findSection,
  findTopic,
  getMockQuestions,
  displayLabel,
} from "@/lib/banks";
import { uiText } from "@/lib/ui-text";
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

  const lang = section.uiLang;
  const t = uiText(lang);
  const base = `${bank.base}/${section.id}/${topic.id}`;

  return (
    <QuizRunner
      questions={questions}
      mockNum={mockNum}
      meta={{
        uiLang: lang,
        examName: bank.name,
        examBase: bank.base,
        sectionName: `${bank.name} · ${displayLabel(section, lang)}`,
        groupName: section.kind === "topic" ? t.topicsWord : t.subjectsWord,
        subjectName: displayLabel(topic, lang),
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
