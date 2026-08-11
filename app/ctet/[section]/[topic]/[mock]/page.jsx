import { notFound } from "next/navigation";
import {
  findCtetSection,
  findCtetTopic,
  getCtetMockQuestions,
  topicLabel,
} from "@/lib/ctet";
import QuizRunner from "@/components/QuizRunner";

export const dynamic = "force-dynamic";

export default async function CtetMockPage({ params }) {
  const mockNum = parseInt(params.mock, 10);
  if (!Number.isInteger(mockNum) || mockNum < 1) notFound();

  const section = findCtetSection(params.section);
  if (!section) notFound();
  const topic = await findCtetTopic(section, params.topic);
  if (!topic || mockNum > topic.mocks) notFound();

  const questions = await getCtetMockQuestions(section, topic, mockNum);
  if (!questions.length) notFound();

  const base = `/ctet/${section.id}/${topic.id}`;

  return (
    <QuizRunner
      questions={questions}
      mockNum={mockNum}
      meta={{
        examName: "CTET",
        examBase: "/ctet",
        sectionName: `CTET · ${section.name}`,
        groupName: section.kind === "topic" ? "Topics" : "Subjects",
        subjectName: topicLabel(topic),
        multiGroup: false,
        base,
        groupBase: `/ctet/${section.id}`,
        sectionBase: `/ctet/${section.id}`,
      }}
      submitMeta={{
        // Prefixed so CTET results stay distinguishable from UPTET ones
        // in the admin dashboard, which keys on these ids.
        sectionId: `ctet-${section.id}`,
        groupId: "ctet",
        subjectId: topic.id,
      }}
    />
  );
}
