"use client";

import { useEffect, useState } from "react";
import { historyByHref, readAttempt, resultTone } from "@/lib/progress";

/**
 * The list of mock papers inside a subject or topic, marked up with what this
 * reader has already done with each one: the score they got, or how far into
 * an unfinished attempt they are.
 *
 * That state lives only in the browser, so the papers render immediately and
 * the badges appear once storage has been read. Labels arrive as plain strings
 * because a server component cannot hand a client component the functions in
 * lib/ui-text.js.
 */
export default function MockPaperGrid({ papers, labels }) {
  const [marks, setMarks] = useState({});

  useEffect(() => {
    const scored = historyByHref();
    const next = {};
    for (const p of papers) {
      const done = scored[p.href];
      const open = readAttempt(p.href);
      if (open && open.answered > 0 && !done) {
        next[p.href] = { kind: "open", answered: open.answered, total: open.total };
      } else if (done) {
        next[p.href] = { kind: "done", pct: done.pct, tone: resultTone(done) };
      }
    }
    setMarks(next);
  }, [papers]);

  return (
    <div className="mock-grid">
      {papers.map((p, i) => {
        const mark = marks[p.href];
        return (
          <a
            key={p.href}
            href={p.href}
            className={`mock-card ${mark ? `is-${mark.kind}` : ""}`}
            style={{ "--i": i }}
          >
            <div className="mock-card-top">
              <span className="mock-title">{p.title}</span>
              {mark?.kind === "done" && (
                <span className={`mock-score ${mark.tone}`}>
                  {mark.pct}%
                </span>
              )}
              {mark?.kind === "open" && (
                <span className="mock-score open">{labels.inProgress}</span>
              )}
            </div>
            <div className="mock-meta">{p.meta}</div>
            <span className="mock-cta">
              {mark?.kind === "done"
                ? labels.retake
                : mark?.kind === "open"
                ? labels.resume
                : labels.start}
            </span>
          </a>
        );
      })}
    </div>
  );
}
