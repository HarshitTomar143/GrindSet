import { getManifest } from "@/lib/data";
import { getExam } from "@/lib/exams";
import { getExamStats } from "@/lib/stats";
import { uiText } from "@/lib/ui-text";
import { bi } from "@/lib/site-lang";
import { getSiteLang } from "@/lib/site-lang-server";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";
import ExamHeader from "@/components/ExamHeader";

export const dynamic = "force-dynamic";

const nf = (n) => n.toLocaleString("en-IN");

// Official UPTET structure: Paper 1 is primary (Classes 1–5), Paper 2 upper
// primary (Classes 6–8). The copy for each lives in lib/ui-text.js.
function isPaper2(sec) {
  return String(sec.id).includes("2") || /\b2\b/.test(sec.name);
}

export default async function UptetHome() {
  const lang = getSiteLang();
  const T = uiText(lang);
  const exam = getExam("uptet", lang);

  let manifest;
  try {
    manifest = await getManifest();
  } catch (e) {
    return (
      <div>
        <BackLink href="/" label={T.exams} />
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
        <BackLink href="/" label={T.exams} />
        <h1 className="page-title">No questions yet</h1>
        <p className="page-sub">
          The database is connected but empty. Run <code>npm run setup</code> to
          seed it from the Excel files.
        </p>
      </div>
    );
  }

  const stats = await getExamStats("uptet");

  return (
    <div data-exam="uptet">
      <BackLink href="/" label={T.exams} />
      <Breadcrumb items={[{ label: T.home, href: "/" }, { label: "UP TET" }]} />

      <ExamHeader exam={exam} stats={stats} sub={T.uptetSub} lang={lang} />

      <h2 className="strip-title">{T.choosePaper}</h2>
      <div className="paper-grid">
        {manifest.sections.map((sec, i) => {
          const subjectCount = sec.groups.reduce(
            (a, g) => a + g.subjects.length,
            0
          );
          const mockCount = sec.groups.reduce(
            (a, g) => a + g.subjects.reduce((b, s) => b + s.mocks, 0),
            0
          );
          const questionCount = sec.groups.reduce(
            (a, g) => a + g.subjects.reduce((b, s) => b + s.total, 0),
            0
          );
          const p2 = isPaper2(sec);
          return (
            <a
              key={sec.id}
              href={`/${sec.id}`}
              className="paper-card"
              style={{ "--i": i }}
            >
              <span className="paper-eyebrow">
                {p2 ? T.paper2Level : T.paper1Level}
              </span>
              <h3 className="paper-title">{bi(lang, sec.name, sec.nameHi, true)}</h3>
              <p className="paper-blurb">{p2 ? T.paper2Blurb : T.paper1Blurb}</p>
              <div className="paper-facts">
                {T.tetFacts.map((f) => (
                  <span className="fact" key={f}>
                    {f}
                  </span>
                ))}
              </div>
              <div className="paper-foot">
                <div className="paper-counts">
                  {sec.groups.length > 1 && (
                    <span>
                      <b>{sec.groups.length}</b> {T.wStreams(sec.groups.length)}
                    </span>
                  )}
                  <span>
                    <b>{subjectCount}</b> {T.wSubjects(subjectCount)}
                  </span>
                  <span>
                    <b>{nf(questionCount)}</b> {T.wQuestions(questionCount)}
                  </span>
                  <span>
                    <b>{mockCount}</b> {T.wMocks(mockCount)}
                  </span>
                </div>
                <span className="paper-cta">{T.openPaper}</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
