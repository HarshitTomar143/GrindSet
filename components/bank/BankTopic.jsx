import { notFound } from "next/navigation";
import { findSection, findTopic, displayLabel, mockSizeOf } from "@/lib/banks";
import { loc } from "@/lib/site-lang";
import { uiText } from "@/lib/ui-text";
import { getSiteLang } from "@/lib/site-lang-server";
import { subjectIcon, firstLetter } from "@/lib/subjects";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";
import MockPaperGrid from "@/components/MockPaperGrid";
import SubjectIcon from "@/components/SubjectIcon";

// The mock papers a single subject or topic is split into.

export default async function BankTopic({ bank, sectionId, topicId }) {
  const section = findSection(bank, sectionId);
  if (!section) notFound();
  const topic = await findTopic(section, topicId);
  if (!topic) notFound();

  const lang = getSiteLang();
  const t = uiText(lang);
  const sectionLabel = displayLabel(section, lang);
  const topicLabel = displayLabel(topic, lang);
  const leadName = lang === "en" ? topic.name : topic.nameHi || topic.name;

  // Labels are resolved here because MockPaperGrid runs on the client and
  // cannot be handed the functions in lib/ui-text.js.
  const size = mockSizeOf(section);
  // A real sitting is one whole paper, so it is not called "Mock Paper 1".
  const wholePaper = topic.mocks === 1 ? loc(section.paperTitle, lang) : null;
  const papers = Array.from({ length: topic.mocks }, (_, i) => {
    const count = Math.min(size, topic.total - i * size);
    return {
      href: `${bank.base}/${section.id}/${topic.id}/${i + 1}`,
      title: wholePaper || t.mockPaper(i + 1),
      meta: t.questionCount(count),
    };
  });

  return (
    <div data-exam={bank.id}>
      <BackLink href={`${bank.base}/${section.id}`} label={sectionLabel} />
      <Breadcrumb
        items={[
          { label: t.home, href: "/" },
          { label: bank.name, href: bank.base },
          { label: sectionLabel, href: `${bank.base}/${section.id}` },
          { label: topicLabel },
        ]}
      />
      <div className="page-title-row">
        <SubjectIcon
          icon={section.kind === "topic" ? null : subjectIcon(topic.id)}
          letter={firstLetter(leadName)}
          size={48}
        />
        <h1 className="page-title">{topicLabel}</h1>
      </div>
      <p className="page-sub">{t.topicSub(topic.total, topic.mocks)}</p>
      <MockPaperGrid
        papers={papers}
        labels={{
          start: t.startTest,
          resume: t.resume,
          retake: t.retake,
          inProgress: t.inProgress,
        }}
      />
    </div>
  );
}
