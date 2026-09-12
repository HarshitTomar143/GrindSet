import { getBankOverview, displayLabel } from "@/lib/banks";
import { getExam } from "@/lib/exams";
import { getExamStats } from "@/lib/stats";
import { uiText } from "@/lib/ui-text";
import { loc } from "@/lib/site-lang";
import { getSiteLang } from "@/lib/site-lang-server";
import { subjectIcon } from "@/lib/subjects";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";
import ExamHeader from "@/components/ExamHeader";
import SubjectIcon from "@/components/SubjectIcon";

// Landing page for a question bank: the exam's masthead, then one card per
// section with live counts. Shared by every bank that reads from
// `ctet_questions` (CTET, UP TGT/PGT).

const nf = (n) => n.toLocaleString("en-IN");

function SetupNotice({ bank, message, T }) {
  return (
    <div>
      <BackLink href="/" label={T.exams} />
      <h1 className="page-title">{bank.name} questions are not loaded</h1>
      <p className="page-sub">{message}</p>
      <div className="q-card">
        <p style={{ marginTop: 0 }}>To load them:</p>
        <ol style={{ lineHeight: 1.8, color: "var(--ink-2)" }}>
          <li>
            Make sure <code>DATABASE_URL</code> is set in{" "}
            <code>.env.local</code>.
          </li>
          <li>
            Run <code>{bank.setupCommand}</code> to parse the workbooks and load
            them into the database.
          </li>
          <li>Refresh this page.</li>
        </ol>
      </div>
    </div>
  );
}

export default async function BankHome({ bank }) {
  const lang = getSiteLang();
  const T = uiText(lang);

  let sections;
  try {
    sections = await getBankOverview(bank);
  } catch (e) {
    return <SetupNotice bank={bank} message={e.message} T={T} />;
  }

  const exam = getExam(bank.id, lang);
  const stats = await getExamStats(bank.id);
  const live = sections.filter((s) => s.total > 0);

  return (
    <div data-exam={bank.id}>
      <BackLink href="/" label={T.exams} />
      <Breadcrumb items={[{ label: T.home, href: "/" }, { label: bank.name }]} />

      <ExamHeader exam={exam} stats={stats} sub={loc(bank.chooseSub, lang)} lang={lang} />

      <h2 className="strip-title">{loc(bank.sectionStripTitle, lang)}</h2>
      <div className="paper-grid">
        {live.map((sec, i) => {
          // A subject section (UP TGT/PGT's Hindi, English, GS) carries its
          // subject icon; a CTET paper has none.
          const icon = subjectIcon(sec.id);
          return (
            <a
              key={sec.id}
              href={`${bank.base}/${sec.id}`}
              className="paper-card"
              style={{ "--i": i }}
            >
              <div className="paper-card-head">
                {icon && <SubjectIcon icon={icon} size={42} />}
                <div className="paper-card-id">
                  <span className="paper-eyebrow">{loc(sec.eyebrow, lang)}</span>
                  <h3 className="paper-title">{displayLabel(sec, lang)}</h3>
                </div>
              </div>
              <p className="paper-blurb">{loc(sec.blurb, lang)}</p>
              <div className="paper-facts">
                {loc(sec.facts, lang).map((f) => (
                  <span className="fact" key={f}>
                    {f}
                  </span>
                ))}
              </div>
              <div className="paper-foot">
                <div className="paper-counts">
                  {sec.groupCount > 0 && (
                    <span>
                      <b>{sec.groupCount}</b> {T.wUnits(sec.groupCount)}
                    </span>
                  )}
                  <span>
                    <b>{sec.topicCount}</b>{" "}
                    {sec.kind === "topic"
                      ? T.wTopics(sec.topicCount)
                      : T.wSubjects(sec.topicCount)}
                  </span>
                  <span>
                    <b>{nf(sec.total)}</b> {T.wQuestions(sec.total)}
                  </span>
                  <span>
                    <b>{nf(sec.mocks)}</b> {T.wMocks(sec.mocks)}
                  </span>
                </div>
                <span className="paper-cta">{T.openSection}</span>
              </div>
            </a>
          );
        })}
      </div>

      {!live.length && (
        <p className="page-sub">
          No {bank.name} questions found yet. Run{" "}
          <code>{bank.setupCommand}</code> to seed them.
        </p>
      )}
    </div>
  );
}
