import ExamLogo from "@/components/ExamLogo";
import { uiText } from "@/lib/ui-text";

/**
 * The masthead on an exam's own pages: whose exam it is, how the real paper is
 * built, and how much of it this app actually carries.
 *
 * `exam` arrives already resolved for the site language (getExam(id, lang)).
 * `stats` is optional and comes from lib/stats.js; when the database is
 * unreachable the header simply drops the counts rather than the whole block.
 */
export default function ExamHeader({ exam, stats, title, sub, lang }) {
  if (!exam) return null;
  const T = uiText(lang);

  const counts = [];
  if (stats?.questions) {
    counts.push(T.questionCount(stats.questions));
    counts.push(T.mockCount(stats.mocks));
  }

  return (
    <header className="exam-header" data-exam={exam.id}>
      <div className="exam-header-top">
        <ExamLogo exam={exam} size={68} />
        <div className="exam-header-id">
          <div className="exam-authority">{exam.authority}</div>
          <h1 className="exam-name">{title || exam.name}</h1>
          <p className="exam-full">{exam.fullName}</p>
        </div>
      </div>

      {sub && <p className="exam-header-sub">{sub}</p>}

      {exam.pattern?.length > 0 && (
        <dl className="exam-pattern">
          {exam.pattern.map(([label, value]) => (
            <div className="exam-pattern-item" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="exam-header-foot">
        {exam.qualifying && (
          <span className="exam-note">
            <b>{T.qualifyingLabel}</b> {exam.qualifying}
          </span>
        )}
        {exam.patternNote && <span className="exam-note">{exam.patternNote}</span>}
        {counts.length > 0 && (
          <span className="exam-note exam-note-count">
            {T.inThisApp} {counts.join(" · ")}
          </span>
        )}
      </div>
    </header>
  );
}
