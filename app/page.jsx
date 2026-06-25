import { getManifest } from "@/lib/data";

export default async function Home() {
  const manifest = await getManifest();
  return (
    <div>
      <h1 className="page-title">Choose your paper</h1>
      <p className="page-sub">
        Select a paper to see its subjects and mock tests. Each mock paper has up
        to {manifest.mockSize} questions and is scored at the end.
      </p>
      <div className="grid two">
        {manifest.sections.map((sec) => {
          const subjectCount = sec.groups.reduce(
            (a, g) => a + g.subjects.length,
            0
          );
          const mockCount = sec.groups.reduce(
            (a, g) => a + g.subjects.reduce((b, s) => b + s.mocks, 0),
            0
          );
          return (
            <a key={sec.id} href={`/${sec.id}`} className="card hero-card">
              <div className="card-title">{sec.name}</div>
              <div className="card-meta">
                {sec.groups.length > 1
                  ? `${sec.groups.length} streams · `
                  : ""}
                {subjectCount} subjects · {mockCount} mock papers
              </div>
              <span className="pill">Start practising →</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
