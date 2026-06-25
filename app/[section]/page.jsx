import { notFound } from "next/navigation";
import { getManifest, findSection } from "@/lib/data";
import Breadcrumb from "@/components/Breadcrumb";
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
        <Breadcrumb items={crumbs} />
        <h1 className="page-title">{section.name}</h1>
        <p className="page-sub">Pick a subject to see its mock papers.</p>
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
        {section.groups.map((g) => (
          <a
            key={g.id}
            href={`/${section.id}/${g.id}`}
            className="card hero-card"
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
