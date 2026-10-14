"use client";

import { useEffect, useMemo, useState } from "react";
import { downloadMockPaperAsJson } from "./PaperDownload";
import { loadView, nf, fmtTime, ago, pctClass } from "./format";

const SORTS = {
  attempts: (a, b) => b.attempts - a.attempts,
  people: (a, b) => b.people - a.people,
  recent: (a, b) => new Date(b.last_at) - new Date(a.last_at),
  hardest: (a, b) => a.avg_pct - b.avg_pct,
  easiest: (a, b) => b.avg_pct - a.avg_pct,
};

export default function TestsTab({ onOpen }) {
  const [tests, setTests] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [exam, setExam] = useState("all");
  const [sort, setSort] = useState("attempts");

  useEffect(() => {
    loadView({ view: "tests" })
      .then((d) => setTests(d.tests))
      .catch((e) => setError(e.message));
  }, []);

  const exams = useMemo(() => [...new Map((tests || []).map((t) => [t.exam.id, t.exam])).values()], [tests]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tests || [])
      .filter((t) => exam === "all" || t.exam.id === exam)
      .filter((t) => !q || `${t.section_name} ${t.subject_name}`.toLowerCase().includes(q))
      .sort(SORTS[sort]);
  }, [tests, search, exam, sort]);

  if (error) return <div className="loading">{error}</div>;
  if (!tests) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="filters">
        <input className="text-input" placeholder="Search by subject or section…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="text-input" value={exam} onChange={(e) => setExam(e.target.value)} aria-label="Exam">
          <option value="all">All exams</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <select className="text-input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="attempts">Most attempted</option>
          <option value="people">Most people</option>
          <option value="recent">Most recent</option>
          <option value="hardest">Lowest average</option>
          <option value="easiest">Highest average</option>
        </select>
      </div>
      <p className="muted-sm" style={{ marginBottom: 10 }}>
        {nf(shown.length)} papers have been sat at least once. Click one to see who sat it.
      </p>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Paper</th>
              <th>Attempts</th>
              <th>People</th>
              <th>Avg %</th>
              <th>Best / worst</th>
              <th>Avg time</th>
              <th>Last sat</th>
              <th>Export</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => {
              const key = `${t.section_id}/${t.group_id}/${t.subject_id}/${t.mock_num}`;
              const label = `${t.subject_name} · Mock ${t.mock_num}`;
              return (
                <tr key={key} className="row-link" onClick={() => onOpen({ test: key, label })}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{label}</div>
                    <div className="muted-sm">{t.exam.name} · {t.section_name}</div>
                  </td>
                  <td>{nf(t.attempts)}</td>
                  <td>{nf(t.people)}</td>
                  <td><span className={`tag ${pctClass(t.avg_pct)}`}>{t.avg_pct}%</span></td>
                  <td>{t.best_pct}% / {t.worst_pct}%</td>
                  <td>{fmtTime(t.avg_seconds)}</td>
                  <td className="muted-sm">{ago(t.last_at)}</td>
                  <td>
                    {t.exam.id === "uptet" && !String(t.subject_id).endsWith("-full") ? (
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadMockPaperAsJson(t);
                        }}
                      >
                        JSON
                      </button>
                    ) : (
                      <span className="muted-sm">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)" }}>No papers match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
