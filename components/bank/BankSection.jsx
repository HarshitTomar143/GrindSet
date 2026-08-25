import { notFound } from "next/navigation";
import {
  findSection,
  getTopics,
  getGroupedTopics,
  displayLabel,
} from "@/lib/banks";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";

// Inside one section: the subjects of a paper, or the topics of a subject that
// is organised by topic. A subject with syllabus units (Hindi) shows its
// topics grouped under those units, in syllabus order.

function TopicCard({ href, topic, i }) {
  return (
    <a href={href} className="card" style={{ "--i": i }}>
      <div className="card-title">{topic.name}</div>
      {topic.nameHi && <div className="card-meta">{topic.nameHi}</div>}
      <div className="card-meta">{topic.total} questions</div>
      <span className="pill">
        {topic.mocks} mock paper{topic.mocks > 1 ? "s" : ""}
      </span>
    </a>
  );
}

export default async function BankSection({ bank, sectionId }) {
  const section = findSection(bank, sectionId);
  if (!section) notFound();

  const base = `${bank.base}/${section.id}`;
  const groups = await getGroupedTopics(section);
  const topics = groups ? null : await getTopics(section);
  const isEmpty = groups ? !groups.length : !topics.length;

  return (
    <div>
      <BackLink href={bank.base} label={bank.name} />
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: bank.name, href: bank.base },
          { label: section.name },
        ]}
      />
      <h1 className="page-title">{displayLabel(section)}</h1>
      <p className="page-sub">
        {groups
          ? "The syllabus, section by section. Pick a topic to see its mock papers."
          : section.kind === "topic"
          ? "Each topic comes from its own question set. Pick one to see its mock papers."
          : "Pick a subject to see its mock papers."}
      </p>

      {groups
        ? groups.map((g, gi) => (
            <section className="topic-group" key={g.id}>
              <header className="topic-group-head">
                <span className="topic-group-num">{gi + 1}</span>
                <div>
                  <h2 className="topic-group-title">{g.nameHi || g.name}</h2>
                  {/* Hindi units caption the roman name under the Devanagari
                      one; English units caption the syllabus section instead. */}
                  {(g.nameHi || g.syllabusPart) && (
                    <div className="topic-group-sub">
                      {g.nameHi ? g.name : g.syllabusPart}
                    </div>
                  )}
                </div>
                <span className="topic-group-count">
                  {g.topics.length} topic{g.topics.length > 1 ? "s" : ""}
                </span>
              </header>
              <div className="grid">
                {g.topics.map((t, i) => (
                  <TopicCard
                    key={t.id}
                    href={`${base}/${t.id}`}
                    topic={t}
                    i={i}
                  />
                ))}
              </div>
            </section>
          ))
        : (
          <div className="grid">
            {topics.map((t, i) => (
              <TopicCard key={t.id} href={`${base}/${t.id}`} topic={t} i={i} />
            ))}
          </div>
        )}

      {isEmpty && (
        <p className="page-sub">
          Nothing loaded for this section yet. Run{" "}
          <code>{bank.setupCommand}</code> to seed it.
        </p>
      )}
    </div>
  );
}
