import { getCtetOverview } from "@/lib/ctet";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

export default async function CtetHome() {
  let sections;
  try {
    sections = await getCtetOverview();
  } catch (e) {
    return (
      <div>
        <BackLink href="/" label="Exams" />
        <h1 className="page-title">CTET questions are not loaded</h1>
        <p className="page-sub">{e.message}</p>
        <div className="q-card">
          <p style={{ marginTop: 0 }}>To load them:</p>
          <ol style={{ lineHeight: 1.8, color: "var(--ink-2)" }}>
            <li>
              Make sure <code>DATABASE_URL</code> is set in{" "}
              <code>.env.local</code>.
            </li>
            <li>
              Run <code>npm run setup:ctet</code> to parse the CTET workbooks and
              load them into the database.
            </li>
            <li>Refresh this page.</li>
          </ol>
        </div>
      </div>
    );
  }

  const live = sections.filter((s) => s.total > 0);

  return (
    <div>
      <BackLink href="/" label="Exams" />
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "CTET" }]} />
      <h1 className="page-title">CTET · Choose a section</h1>
      <p className="page-sub">
        Every section is split into mock papers of 30 questions, scored as soon
        as you submit. Paper 1 and Paper 2 are organised by subject; Hindi
        Sahitya is organised by literature topic.
      </p>
      <div className="grid two">
        {live.map((sec, i) => (
          <a
            key={sec.id}
            href={`/ctet/${sec.id}`}
            className="card hero-card"
            style={{ "--i": i }}
          >
            <span className="card-eyebrow">{sec.eyebrow}</span>
            <div className="card-title">{sec.name}</div>
            <p className="card-blurb">{sec.blurb}</p>
            <div className="fact-row">
              {sec.facts.map((f) => (
                <span className="fact" key={f}>
                  {f}
                </span>
              ))}
            </div>
            <div className="card-meta">
              {sec.topicCount} {sec.kind === "topic" ? "topics" : "subjects"} ·{" "}
              {sec.total.toLocaleString("en-IN")} questions · {sec.mocks} mock
              papers
            </div>
            <span className="pill">Open section →</span>
          </a>
        ))}
      </div>
      {!live.length && (
        <p className="page-sub">
          No CTET questions found yet. Run <code>npm run setup:ctet</code> to
          seed them.
        </p>
      )}
    </div>
  );
}
