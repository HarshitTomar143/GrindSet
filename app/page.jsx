import WelcomeModal from "@/components/WelcomeModal";
import ContinuePractice from "@/components/ContinuePractice";
import ExamLogo from "@/components/ExamLogo";
import { listExams } from "@/lib/exams";
import { getAllExamStats } from "@/lib/stats";
import { uiText } from "@/lib/ui-text";
import { getSiteLang } from "@/lib/site-lang-server";

export const dynamic = "force-dynamic";

const nf = (n) => n.toLocaleString("en-IN");
const PART_WORD = { papers: "wPapers", subjects: "wSubjects", topics: "wTopics" };

/**
 * One exam on the chooser. `wide` is the horizontal layout used for the
 * featured exam: identity and copy on the left, counts and the button on the
 * right. The default is the upright card the other exams sit in side by side.
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
      {wide ? <div className="exam-card-main">{body}</div> : body}
      <div className={wide ? "exam-card-side" : "exam-card-foot"}>
        {counts}
        <span className="exam-card-cta">{T.startPractising}</span>
      </div>
    </a>
  );
}

export default async function Home() {
  const lang = getSiteLang();
  const T = uiText(lang);
  const exams = listExams(lang);
  const stats = await getAllExamStats();

  const live = Object.values(stats).filter(Boolean);
  const totalQuestions = live.reduce((a, s) => a + s.questions, 0);
  const totalMocks = live.reduce((a, s) => a + s.mocks, 0);

  // The featured exam leads, full width; the rest follow side by side.
  const featured = exams.filter((e) => e.featured);
  const others = exams.filter((e) => !e.featured);

  return (
    <div>
      <WelcomeModal lang={lang} />

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

      <p className="app-disclaimer">
        <strong>{T.disclaimerLead}</strong> {T.disclaimerBody}
      </p>
    </div>
  );
}
