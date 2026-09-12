"use client";

import { useEffect, useState } from "react";
import { historyByHref } from "@/lib/progress";
import SubjectIcon from "@/components/SubjectIcon";

/**
 * Subject or topic cards, each showing its icon and how much of it this reader
 * has already worked through.
 *
 * Card data comes from topicCard() in lib/subjects.js, resolved to plain
 * strings on the server. Coverage is counted from the browser's own record of
 * scored papers, so a candidate planning a week's revision can see at a glance
 * which chapters they have never opened. It renders unmarked first and fills
 * in after mount, so a blocked-storage browser still gets the full list.
 */
export default function TopicGrid({ topics }) {
  const [done, setDone] = useState({});

  useEffect(() => {
    const scored = historyByHref();
    const counts = {};
    for (const topic of topics) {
      let n = 0;
      for (let i = 1; i <= topic.mocks; i++) {
        if (scored[`${topic.href}/${i}`]) n++;
      }
      if (n) counts[topic.id] = n;
    }
    setDone(counts);
  }, [topics]);

  return (
    <div className="grid">
      {topics.map((topic, i) => {
        const finished = done[topic.id] || 0;
        const pct = Math.round((finished / topic.mocks) * 100);
        return (
          <a
            key={topic.id}
            href={topic.href}
            className="card topic-card"
            style={{ "--i": i }}
          >
            <div className="topic-card-head">
              <SubjectIcon icon={topic.icon} letter={topic.letter} />
              <div className="topic-card-names">
                <div className="card-title">{topic.title}</div>
                {topic.sub && <div className="card-sub">{topic.sub}</div>}
              </div>
            </div>
            <div className="card-meta topic-card-count">{topic.questions}</div>
            <div className="topic-foot">
              <span className="pill">{topic.papers}</span>
              {finished > 0 && (
                <>
                  <div className="topic-progress" aria-hidden="true">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span className="topic-done">
                    {finished}/{topic.mocks}
                  </span>
                </>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}
