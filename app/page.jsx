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

export default async function Home() {
  const lang = getSiteLang();
  const T = uiText(lang);
  const exams = listExams(lang);
  const stats = await getAllExamStats();

  const live = Object.values(stats).filter(Boolean);
  const totalQuestions = live.reduce((a, s) => a + s.questions, 0);
  const totalMocks = live.reduce((a, s) => a + s.mocks, 0);

  return (
    <div>
      <WelcomeModal lang={lang} />

      <section className="home-hero">
        <p className="hero-eyebrow">{T.heroEyebrow}</p>
        {/* In "both" the Hindi headline leads and the English one sits under it
            as a subtitle, rather than one very long two-language headline. */}
        <h1 className="hero-title">
          {lang === "both" ? uiText("hi").heroTitle : T.heroTitle}
        </h1>
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

      <ContinuePractice lang={lang} />

      <h2 className="strip-title">{T.chooseExam}</h2>
      <div className="exam-grid">
        {exams.map((exam, i) => {
          const s = stats[exam.id];
          const partWord = T[PART_WORD[s?.partKind]] || T.wTopics;
          return (
            <a
              key={exam.id}
              href={exam.href}
              className="exam-card"
              data-exam={exam.id}
              style={{ "--i": i }}
            >
              <div className="exam-card-head">
                <ExamLogo exam={exam} size={54} />
                <div className="exam-card-id">
                  <span className="exam-card-authority">
                    {exam.authorityShort}
                  </span>
                  <span className="exam-card-name">{exam.name}</span>
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

              <div className="exam-card-foot">
                {s ? (
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
                )}
                <span className="exam-card-cta">{T.startPractising}</span>
              </div>
            </a>
          );
        })}
      </div>

      <p className="app-disclaimer">
        <strong>{T.disclaimerLead}</strong> {T.disclaimerBody}
      </p>
    </div>
  );
}
