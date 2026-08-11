import { notFound } from "next/navigation";
import { findCtetSection, findCtetTopic, topicLabel } from "@/lib/ctet";
import { MOCK_SIZE } from "@/lib/db";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

export default async function CtetTopicPage({ params }) {
  const section = findCtetSection(params.section);
  if (!section) notFound();
  const topic = await findCtetTopic(section, params.topic);
  if (!topic) notFound();

  const papers = Array.from({ length: topic.mocks }, (_, i) => ({
    n: i + 1,
    count: Math.min(MOCK_SIZE, topic.total - i * MOCK_SIZE),
  }));

  return (
    <div>
      <BackLink href={`/ctet/${section.id}`} label={section.name} />
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "CTET", href: "/ctet" },
          { label: section.name, href: `/ctet/${section.id}` },
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
            href={`/ctet/${section.id}/${topic.id}/${p.n}`}
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
