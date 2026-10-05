import { notFound } from "next/navigation";
import {
  findSection,
  findTopic,
  getMockQuestions,
  displayLabel,
} from "@/lib/banks";
import { uiText } from "@/lib/ui-text";
import { getExam } from "@/lib/exams";
import { loc } from "@/lib/site-lang";
import { getSiteLang } from "@/lib/site-lang-server";
import { getAccount } from "@/lib/auth";
import QuizRunner from "@/components/QuizRunner";

// One mock paper, handed to the shared quiz runner.

export default async function BankMock({ bank, sectionId, topicId, mock }) {
  const mockNum = parseInt(mock, 10);
  if (!Number.isInteger(mockNum) || mockNum < 1) notFound();

  const section = findSection(bank, sectionId);
  if (!section) notFound();
  const topic = await findTopic(section, topicId);
  if (!topic || mockNum > topic.mocks) notFound();

  const lang = getSiteLang();
  const t = uiText(lang);

  const questions = await getMockQuestions(section, topic, mockNum, lang);
  if (!questions.length) notFound();

  const kindWord = (l, T) =>
    loc(section.groupLabel, l) ||
    (section.kind === "topic" ? T.topicsWord : T.subjectsWord);
  const exam = getExam(bank.id);
  const base = `${bank.base}/${section.id}/${topic.id}`;

  return (
    <QuizRunner
      questions={questions}
      mockNum={mockNum}
      account={await getAccount()}
      meta={{
        uiLang: lang,
        examId: bank.id,
        examLogo: exam?.logo || null,
        examName: bank.name,
        examBase: bank.base,
        // null for an exam with no published qualifying mark: no verdict shown.
        passMark: exam?.cutoff?.general ?? null,
        mockCount: topic.mocks,
        sectionName: `${bank.name} · ${displayLabel(section, lang)}`,
        groupName: kindWord(lang, t),
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
        // Saved results keep English names whatever the reader sees.
        sectionName: `${bank.name} · ${displayLabel(section, "en")}`,
        groupName: kindWord("en", uiText("en")),
        subjectName: displayLabel(topic, "en"),
      }}
    />
  );
}
