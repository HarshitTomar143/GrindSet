import { getManifest } from "@/lib/data";

// Official UPTET structure (Uttar Pradesh Teacher Eligibility Test).
const PAPER_INFO = {
  "1": {
    classes: "Classes 1–5",
    level: "Primary level",
    blurb:
      "For candidates who want to teach at the primary level. Covers Child Development & Pedagogy, Language I, Language II, Mathematics and Environmental Studies.",
    facts: ["150 questions", "150 marks", "2½ hours", "No negative marking"],
    qualify: "Qualify at 60% · 55% for OBC / SC / ST",
  },
  "2": {
    classes: "Classes 6–8",
    level: "Upper primary level",
    blurb:
      "For candidates who want to teach at the upper primary level. Covers Child Development & Pedagogy, the languages, plus Mathematics & Science and Social Studies.",
    facts: ["150 questions", "150 marks", "2½ hours", "No negative marking"],
    qualify: "Qualify at 60% · 55% for OBC / SC / ST",
  },
};

function paperInfo(sec) {
  const isPaper2 = String(sec.id).includes("2") || /\b2\b/.test(sec.name);
  return PAPER_INFO[isPaper2 ? "2" : "1"];
}

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
        The UPTET is held in two papers. Pick the one for the level you want to
        teach, then practise its subject-wise mock tests — each has up to{" "}
        {manifest.mockSize} questions and is scored at the end.
      </p>
      <div className="grid two">
        {manifest.sections.map((sec, i) => {
          const subjectCount = sec.groups.reduce(
            (a, g) => a + g.subjects.length,
            0
          );
          const mockCount = sec.groups.reduce(
            (a, g) => a + g.subjects.reduce((b, s) => b + s.mocks, 0),
            0
          );
          const info = paperInfo(sec);
          return (
            <a
              key={sec.id}
              href={`/${sec.id}`}
              className="card hero-card"
              style={{ "--i": i }}
            >
              <span className="card-eyebrow">
                {info.classes} · {info.level}
              </span>
              <div className="card-title">{sec.name}</div>
              <p className="card-blurb">{info.blurb}</p>
              <div className="fact-row">
                {info.facts.map((f) => (
                  <span className="fact" key={f}>
                    {f}
                  </span>
                ))}
              </div>
              <div className="card-meta">
                {sec.groups.length > 1
                  ? `${sec.groups.length} streams · `
                  : ""}
                {subjectCount} subjects · {mockCount} mock papers in this app
              </div>
              <div className="card-qualify">{info.qualify}</div>
              <span className="pill">Start practicing →</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
