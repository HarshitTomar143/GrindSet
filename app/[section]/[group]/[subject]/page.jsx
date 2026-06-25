import { notFound } from "next/navigation";
import {
  getManifest,
  findSection,
  findGroup,
  findSubject,
} from "@/lib/data";
import Breadcrumb from "@/components/Breadcrumb";

export default async function SubjectPage({ params }) {
  const manifest = await getManifest();
  const section = findSection(manifest, params.section);
  const group = findGroup(section, params.group);
  const subject = findSubject(group, params.subject);
  if (!section || !group || !subject) notFound();

  const size = manifest.mockSize;
  const papers = Array.from({ length: subject.mocks }, (_, i) => {
    const start = i * size;
    const count = Math.min(size, subject.total - start);
    return { n: i + 1, count };
  });

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: section.name, href: `/${section.id}` },
          ...(section.groups.length > 1
            ? [{ label: group.name, href: `/${section.id}/${group.id}` }]
            : []),
          { label: subject.name },
        ]}
      />
      <h1 className="page-title">{subject.name}</h1>
      <p className="page-sub">
        {subject.total} questions · {subject.mocks} mock paper
        {subject.mocks > 1 ? "s" : ""}. Each paper is scored at the end.
      </p>
      <div className="grid">
        {papers.map((p) => (
          <a
            key={p.n}
            href={`/${section.id}/${group.id}/${subject.id}/${p.n}`}
            className="card"
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
