import { scoreTone } from "@/lib/score-trend";
import ScoreChart from "./ScoreChart";

/**
 * The signed-in candidate's panel: headline numbers, the score chart, which
 * papers to sit next and the papers already scored. Takes what
 * getDashboard() returns; `examList` is every exam, for a candidate with
 * nothing left to suggest.
 */

const RECENT_MAX = 20;
const ARROW = { up: "▲", down: "▼", flat: "■" };
const TREND_LABEL = { up: "dashTrendUp", down: "dashTrendDown", flat: "dashTrendFlat" };

function Tile({ label, value, note, children }) {
  return (
    <div className="dash-tile">
      <div className="dash-tile-label">{label}</div>
      <div className="dash-tile-value">{children ?? value}</div>
      {note && <div className="dash-note">{note}</div>}
    </div>
  );
}

function Delta({ delta, hint }) {
  if (delta === null) return null;
  const dir = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return (
    <span className="dash-delta" title={hint}>
      <span className={`dash-arrow ${dir}`} aria-hidden="true">{ARROW[dir]}</span>
      {delta > 0 ? "+" : ""}
      {delta}
    </span>
  );
}

// A paper whose subject has since left the bank is listed, but cannot be opened.
function Row({ href, examId, children }) {
  return href ? (
    <a className="dash-row" href={href} data-exam={examId || undefined}>{children}</a>
  ) : (
    <div className="dash-row" data-exam={examId || undefined}>{children}</div>
  );
}

function ExamLinks({ exams }) {
  return (
    <div className="recent-list">
      {exams.map((e) => (
        <a className="recent-chip" key={e.id} href={e.href} data-exam={e.id}>
          <span className="recent-name">{e.name}</span>
        </a>
      ))}
    </div>
  );
}

export default function Dashboard({ data, examList, T, lang }) {
  const { attempts, stats, exams, next, retry } = data;

  if (!attempts.length) {
    return (
      <>
        <h2 className="strip-title">{T.dashNextTitle}</h2>
        <p className="page-sub">{T.accountNoResults}</p>
        <p className="dash-note dash-gap">{T.dashNextEmpty}</p>
        <ExamLinks exams={examList} />
      </>
    );
  }

  const { trend } = stats;
  const recent = attempts.slice(-RECENT_MAX).reverse();

  return (
    <>
      <div className="dash-tiles">
        <Tile label={T.dashPapers} value={stats.papers} />
        <Tile label={T.dashAverage} value={`${stats.average}%`} />
        <Tile label={T.dashBest} value={`${stats.best}%`} />
        {trend ? (
          <Tile
            label={T.dashTrend}
            note={T.dashTrendNote(trend.recent, trend.earlier, trend.span)}
          >
            <span className={`dash-arrow ${trend.dir}`} aria-hidden="true">{ARROW[trend.dir]}</span>{" "}
            {T[TREND_LABEL[trend.dir]]}
          </Tile>
        ) : (
          <Tile label={T.dashTrend} value="—" note={T.dashTrendNone} />
        )}
      </div>

      <ScoreChart attempts={attempts} exams={exams} lang={lang} />

      <div className="dash-cols">
        <section>
          <h2 className="strip-title">{T.dashNextTitle}</h2>
          {next.length > 0 ? (
            <div className="dash-list">
              {next.map((p) => (
                <a className="dash-row" key={p.href} href={p.href} data-exam={p.examId}>
                  <span className="dash-row-main">
                    <span className="dash-row-title">
                      {p.name} · {T.mockPaper(p.mock)}
                    </span>
                    <span className="muted-sm">
                      {p.examName} · {T.dashNextNote(p.done, p.mocks)}
                    </span>
                    <span className="resume-bar" aria-hidden="true">
                      <span style={{ width: `${(p.done / p.mocks) * 100}%` }} />
                    </span>
                  </span>
                  <span className="btn btn-sm">{T.dashStart}</span>
                </a>
              ))}
            </div>
          ) : (
            <>
              <p className="dash-note dash-gap">{T.dashNextAllDone}</p>
              <ExamLinks exams={examList} />
            </>
          )}

          {retry.length > 0 && (
            <>
              <h2 className="strip-title">{T.dashRetryTitle}</h2>
              <div className="dash-list">
                {retry.map((p) => (
                  <a className="dash-row" key={p.href} href={p.href} data-exam={p.examId}>
                    <span className="dash-row-main">
                      <span className="dash-row-title">
                        {p.name} · {T.mockPaper(p.mock)}
                      </span>
                      <span className="muted-sm">
                        {p.examName} · {T.dashRetryNote(p.pct)}
                      </span>
                    </span>
                    <span className="btn btn-sm ghost">{T.dashRetake}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </section>

        <section>
          <h2 className="strip-title">{T.accountResults}</h2>
          <div className="dash-list">
            {recent.map((r) => (
              <Row key={r.id} href={r.href} examId={r.examId}>
                <span className={`recent-score ${scoreTone(r.pct, r.passMark)}`}>{r.pct}%</span>
                <span className="dash-row-main">
                  <span className="dash-row-title">
                    {r.name} · {T.mockPaper(r.mock)}
                  </span>
                  <span className="muted-sm">
                    {r.examName} · {r.when} · {r.correct}/{r.total}
                  </span>
                </span>
                <Delta delta={r.delta} hint={T.dashDeltaHint} />
              </Row>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
