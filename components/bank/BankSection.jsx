import { notFound } from "next/navigation";
import { findSection, getTopics } from "@/lib/banks";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";

// Inside one section: the subjects of a paper, or the topics of a bank that is
// organised by literature topic.

export default async function BankSection({ bank, sectionId }) {
  const section = findSection(bank, sectionId);
  if (!section) notFound();

  const topics = await getTopics(section);
  const isTopicSection = section.kind === "topic";

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
      <h1 className="page-title">{section.name}</h1>
      <p className="page-sub">
        {isTopicSection
          ? "Each topic comes from its own question set. Pick one to see its mock papers."
          : "Pick a subject to see its mock papers."}
      </p>
      <div className="grid">
        {topics.map((t, i) => (
          <a
            key={t.id}
            href={`${bank.base}/${section.id}/${t.id}`}
            className="card"
            style={{ "--i": i }}
          >
            <div className="card-title">{t.name}</div>
            {t.nameHi && <div className="card-meta">{t.nameHi}</div>}
            <div className="card-meta">{t.total} questions</div>
            <span className="pill">
              {t.mocks} mock paper{t.mocks > 1 ? "s" : ""}
            </span>
          </a>
        ))}
      </div>
      {!topics.length && (
        <p className="page-sub">
          Nothing loaded for this section yet. Run{" "}
          <code>{bank.setupCommand}</code> to seed it.
        </p>
      )}
    </div>
  );
}
