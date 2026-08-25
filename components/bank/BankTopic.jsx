import { notFound } from "next/navigation";
import { findSection, findTopic, displayLabel } from "@/lib/banks";
import { MOCK_SIZE } from "@/lib/db";
import { uiText } from "@/lib/ui-text";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";

// The mock papers a single subject or topic is split into.

export default async function BankTopic({ bank, sectionId, topicId }) {
  const section = findSection(bank, sectionId);
  if (!section) notFound();
  const topic = await findTopic(section, topicId);
  if (!topic) notFound();

  const lang = section.uiLang;
  const t = uiText(lang);
  const sectionLabel = displayLabel(section, lang);
  const topicLabel = displayLabel(topic, lang);

  const papers = Array.from({ length: topic.mocks }, (_, i) => ({
    n: i + 1,
    count: Math.min(MOCK_SIZE, topic.total - i * MOCK_SIZE),
  }));

  return (
    <div>
      <BackLink href={`${bank.base}/${section.id}`} label={sectionLabel} />
      <Breadcrumb
        items={[
          { label: t.home, href: "/" },
          { label: bank.name, href: bank.base },
          { label: sectionLabel, href: `${bank.base}/${section.id}` },
          { label: topicLabel },
        ]}
      />
      <h1 className="page-title">{topicLabel}</h1>
      <p className="page-sub">{t.topicSub(topic.total, topic.mocks)}</p>
      <div className="grid">
        {papers.map((p, i) => (
          <a
            key={p.n}
            href={`${bank.base}/${section.id}/${topic.id}/${p.n}`}
            className="card"
            style={{ "--i": i }}
          >
            <div className="card-title">{t.mockPaper(p.n)}</div>
            <div className="card-meta">{t.questionCount(p.count)}</div>
            <span className="pill">{t.startTest}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
