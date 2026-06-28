import { notFound } from "next/navigation";
import { getManifest, findSection } from "@/lib/data";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";
import SubjectGrid from "@/components/SubjectGrid";

export default async function SectionPage({ params }) {
  const manifest = await getManifest();
  const section = findSection(manifest, params.section);
  if (!section) notFound();

  const crumbs = [
    { label: "Home", href: "/" },
    { label: section.name },
  ];

  // Single group (e.g. Paper 1): show subjects directly.
  if (section.groups.length === 1) {
    const g = section.groups[0];
    return (
      <div>
        <BackLink href="/" label="Home" />
        <Breadcrumb items={crumbs} />
        <h1 className="page-title">{section.name}</h1>
        <p className="page-sub">Pick a subject to see its mock papers.</p>
        {(section.id === "paper1" || section.id === "paper2") && (
          <div style={{ marginBottom: 20 }}>
            <a
              href={`/${section.id}/${g.id}/${section.id}-full`}
              className="card hero-card"
            >
              <div className="card-title">{section.name} Full Mock Papers</div>
              <div className="card-meta">
                {section.id === "paper1"
                  ? "3 full mocks · choose English or Sanskrit"
                  : "3 full mocks · choose stream and English or Sanskrit"}
              </div>
              <span className="pill">Start full mock →</span>
            </a>
          </div>
        )}
        <SubjectGrid sectionId={section.id} groupId={g.id} subjects={g.subjects} />
      </div>
    );
  }

  // Multiple groups (e.g. Paper 2 streams): show stream cards.
  return (
    <div>
      <Breadcrumb items={crumbs} />
      <h1 className="page-title">{section.name}</h1>
      <p className="page-sub">Choose a stream.</p>
      <div className="grid two">
        {section.groups.map((g, i) => (
          <a
            key={g.id}
            href={`/${section.id}/${g.id}`}
            className="card hero-card"
            style={{ "--i": i }}
          >
            <div className="card-title">{g.name}</div>
            <div className="card-meta">{g.subjects.length} subjects</div>
            <span className="pill">Open →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
