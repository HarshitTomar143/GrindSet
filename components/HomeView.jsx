import WelcomeModal from "@/components/WelcomeModal";
import ContinuePractice from "@/components/ContinuePractice";
import ExamLogo from "@/components/ExamLogo";
import ImportantPdfs from "@/components/ImportantPdfs";
import { listExams } from "@/lib/exams";
import { uiText } from "@/lib/ui-text";

const nf = (n) => n.toLocaleString("en-IN");
const PART_WORD = { papers: "wPapers", subjects: "wSubjects", topics: "wTopics" };

/**
 * One exam on the chooser, in two parts: who it is and what it holds (main),
 * then the counts and the button (side). The stylesheet decides how the two
 * sit - stacked on a phone, side by side on a tablet, and on a laptop upright
 * columns under the `wide` featured card, which stays sideways.
 */
function ExamCard({ exam, stats: s, T, index, wide = false }) {
  const partWord = T[PART_WORD[s?.partKind]] || T.wTopics;
  const counts = s ? (
    <div className="exam-card-counts">
      <span>
        <b>{nf(s.questions)}</b> {T.wQuestions(s.questions)}
      </span>
      <span>
        <b>{nf(s.mocks)}</b> {T.wMocks(s.mocks)}
      </span>
      <span>
        <b>{nf(s.parts)}</b> {partWord(s.parts)}
      </span>
    </div>
  ) : (
    <div className="exam-card-counts">
      <span>{exam.papers}</span>
    </div>
  );

  const body = (
    <>
      <div className="exam-card-head">
        <ExamLogo exam={exam} size={wide ? 64 : 54} />
        <div className="exam-card-id">
          <span className="exam-card-authority">{exam.authorityShort}</span>
          <span className="exam-card-name">
            {exam.name}
            {exam.badge && <span className="exam-badge">{exam.badge}</span>}
          </span>
        </div>
      </div>

      <p className="exam-card-full">{exam.fullName}</p>
      <p className="exam-card-blurb">{exam.tagline}</p>

      <div className="exam-card-facts">
        {exam.facts.map((f) => (
          <span className="fact" key={f}>
            {f}
          </span>
        ))}
      </div>
    </>
  );

  return (
    <a
      href={exam.href}
      className={wide ? "exam-card exam-card-wide" : "exam-card"}
      data-exam={exam.id}
      style={{ "--i": index }}
    >
      <div className="exam-card-main">{body}</div>
      <div className="exam-card-side">
        {counts}
        <span className="exam-card-cta">{T.startPractising}</span>
      </div>
    </a>
  );
}

/**
 * The home page's markup, given its data. Kept apart from app/page.jsx (which
 * only loads the data) so the layout can be previewed with sample items.
 */
export default function HomeView({ lang, stats, pdfs }) {
  const T = uiText(lang);
  const exams = listExams(lang);

  const live = Object.values(stats).filter(Boolean);
  const totalQuestions = live.reduce((a, s) => a + s.questions, 0);
  const totalMocks = live.reduce((a, s) => a + s.mocks, 0);

  // The featured exam leads, full width; the rest follow side by side.
  const featured = exams.filter((e) => e.featured);
  const others = exams.filter((e) => !e.featured);

  return (
    <div>
      <WelcomeModal lang={lang} />

      {/* Exams on the left, news & PDFs in a column on the right on a laptop.
          On smaller screens the column drops in under the exams. */}
      <div className={pdfs.length ? "home-layout has-side" : "home-layout"}>
      <div className="home-exams">
      {/* The exams come first: choosing one is what this page is for. */}
      <h1 className="strip-title home-lead">{T.chooseExam}</h1>

      {featured.length > 0 && (
        <div className="exam-featured">
          {featured.map((exam, i) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              stats={stats[exam.id]}
              T={T}
              index={i}
              wide
            />
          ))}
        </div>
      )}

      <div className="exam-grid">
        {others.map((exam, i) => (
          <ExamCard
            key={exam.id}
            exam={exam}
            stats={stats[exam.id]}
            T={T}
            index={featured.length + i}
          />
        ))}
      </div>
      </div>

      {pdfs.length > 0 && (
        <aside className="home-side">
          <ImportantPdfs items={pdfs} lang={lang} />
        </aside>
      )}

      <div className="home-rest">
      <ContinuePractice lang={lang} />

      <section className="home-hero home-hero-below">
        <p className="hero-eyebrow">{T.heroEyebrow}</p>
        {/* In "both" the Hindi headline leads and the English one sits under it
            as a subtitle, rather than one very long two-language headline. */}
        <h2 className="hero-title">
          {lang === "both" ? uiText("hi").heroTitle : T.heroTitle}
        </h2>
        {lang === "both" && (
          <p className="hero-title-alt" lang="en">
            {uiText("en").heroTitle}
          </p>
        )}
        <p className="hero-sub">{T.heroSub}</p>
        {totalQuestions > 0 && (
          <dl className="hero-stats">
            <div>
              <dt>{T.statQuestions}</dt>
              <dd>{nf(totalQuestions)}</dd>
            </div>
            <div>
              <dt>{T.statMocks}</dt>
              <dd>{nf(totalMocks)}</dd>
            </div>
            <div>
              <dt>{T.statExams}</dt>
              <dd>{exams.length}</dd>
            </div>
          </dl>
        )}
      </section>
      </div>
      </div>

      <p className="app-disclaimer">
        <strong>{T.disclaimerLead}</strong> {T.disclaimerBody}
      </p>
    </div>
  );
}
