import { notFound } from "next/navigation";
import { findSection, findTopic, topicLabel } from "@/lib/banks";
import { MOCK_SIZE } from "@/lib/db";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";

// The mock papers a single subject or topic is split into.

export default async function BankTopic({ bank, sectionId, topicId }) {
  const section = findSection(bank, sectionId);
  if (!section) notFound();
  const topic = await findTopic(section, topicId);
  if (!topic) notFound();

  const papers = Array.from({ length: topic.mocks }, (_, i) => ({
    n: i + 1,
    count: Math.min(MOCK_SIZE, topic.total - i * MOCK_SIZE),
  }));

  return (
    <div>
      <BackLink href={`${bank.base}/${section.id}`} label={section.name} />
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: bank.name, href: bank.base },
          { label: section.name, href: `${bank.base}/${section.id}` },
          { label: topic.name },
        ]}
      />
      <h1 className="page-title">{topicLabel(topic)}</h1>
      <p className="page-sub">
        {topic.total} questions · {topic.mocks} mock paper
        {topic.mocks > 1 ? "s" : ""}. Each paper is scored at the end.
      </p>
      <div className="grid">
        {papers.map((p, i) => (
          <a
            key={p.n}
            href={`${bank.base}/${section.id}/${topic.id}/${p.n}`}
            className="card"
            style={{ "--i": i }}
          >
            <div className="card-title">Mock Paper {p.n}</div>
            <div className="card-meta">{p.count} questions</div>
            <span className="pill">Start test →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
