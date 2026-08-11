import { notFound } from "next/navigation";
import { findCtetSection, getCtetTopics } from "@/lib/ctet";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

export default async function CtetSectionPage({ params }) {
  const section = findCtetSection(params.section);
  if (!section) notFound();

  const topics = await getCtetTopics(section);
  const isTopicSection = section.kind === "topic";

  return (
    <div>
      <BackLink href="/ctet" label="CTET" />
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "CTET", href: "/ctet" },
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
            href={`/ctet/${section.id}/${t.id}`}
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
          <code>npm run setup:ctet</code> to seed it.
        </p>
      )}
    </div>
  );
}
