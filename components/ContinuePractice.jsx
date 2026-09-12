"use client";

import { useEffect, useState } from "react";
import {
  listAttempts,
  readHistory,
  clearAttempt,
  resultTone,
} from "@/lib/progress";
import { uiText } from "@/lib/ui-text";

/**
 * "Where you left off" on the chooser: papers still open, then papers already
 * scored. Both come from this browser's own storage, so the strip is empty on
 * a first visit and never blocks the page while it loads.
 */

function timeAgo(ts, T) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return T.justNow;
  if (mins < 60) return T.minsAgo(mins);
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return T.hoursAgo(hrs);
  return T.daysAgo(Math.round(hrs / 24));
}

export default function ContinuePractice({ lang }) {
  const T = uiText(lang);
  const [attempts, setAttempts] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setAttempts(listAttempts().slice(0, 3));
    setHistory(readHistory().slice(0, 4));
  }, []);

  const drop = (href) => {
    clearAttempt(href);
    setAttempts((list) => list.filter((a) => a.href !== href));
  };

  if (!attempts.length && !history.length) return null;

  return (
    <section className="resume-strip">
      {attempts.length > 0 && (
        <>
          <h2 className="strip-title">{T.carryOn}</h2>
          <div className="resume-list">
            {attempts.map((a) => (
              <div className="resume-card" key={a.href} data-exam={a.examId}>
                <div className="resume-body">
                  <div className="resume-name">{a.title}</div>
                  <div className="resume-meta">
                    {T.answeredOf(a.answered, a.total)} · {timeAgo(a.at, T)}
                  </div>
                  <div className="resume-bar" aria-hidden="true">
                    <span style={{ width: `${(a.answered / a.total) * 100}%` }} />
                  </div>
                </div>
                <div className="resume-actions">
                  <a className="btn btn-sm" href={a.href}>
                    {T.resumeBtn}
                  </a>
                  <button
                    className="linklike"
                    onClick={() => drop(a.href)}
                    title={T.forgetAttempt}
                  >
                    {T.discard}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {history.length > 0 && (
        <>
          <h2 className="strip-title">{T.recentlyScored}</h2>
          <div className="recent-list">
            {history.map((h) => (
              <a className="recent-chip" key={h.href} href={h.href} data-exam={h.examId}>
                <span className={`recent-score ${resultTone(h)}`}>
                  {h.pct}%
                </span>
                <span className="recent-name">
                  {h.title}
                  <span className="recent-when">{timeAgo(h.at, T)}</span>
                </span>
              </a>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
