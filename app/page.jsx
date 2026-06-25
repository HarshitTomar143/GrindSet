import { getManifest } from "@/lib/data";

export default async function Home() {
  let manifest;
  try {
    manifest = await getManifest();
  } catch (e) {
    return (
      <div>
        <h1 className="page-title">Setup needed</h1>
        <p className="page-sub">{e.message}</p>
        <div className="q-card">
          <p style={{ marginTop: 0 }}>To get started:</p>
          <ol style={{ lineHeight: 1.8, color: "var(--ink-2)" }}>
            <li>
              Copy <code>.env.example</code> to <code>.env.local</code> and set
              your <code>DATABASE_URL</code>.
            </li>
            <li>
              Run <code>npm run setup</code> to parse the Excel files and load
              them into the database.
            </li>
            <li>Refresh this page.</li>
          </ol>
        </div>
      </div>
    );
  }

  if (!manifest.sections.length) {
    return (
      <div>
        <h1 className="page-title">No questions yet</h1>
        <p className="page-sub">
          The database is connected but empty. Run <code>npm run setup</code> to
          seed it from the Excel files.
        </p>
      </div>
    );
  }

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
