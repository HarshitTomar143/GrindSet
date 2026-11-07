"use client";

import { useState } from "react";
import { downloadMockPaperAsJson } from "./PaperDownload";
import { nf, fmtTime, ago, pctClass } from "./format";
import { usePagedFetch, viewUrl, Pager, useDebounced, usePage } from "./paging";

/** Papers that have been sat, a page at a time; search, filter and sort run on the server. */
export default function TestsTab({ onOpen }) {
  const [search, setSearch] = useState("");
  const [exam, setExam] = useState("");
  const [sort, setSort] = useState("attempts");
  const q = useDebounced(search.trim());
  const [page, setPage] = usePage({ q, exam, sort });

  const { data, error, loading } = usePagedFetch(viewUrl({ view: "tests", q, exam, sort, page }));

  if (error && !data) return <div className="loading">{error}</div>;
  if (!data) return <div className="loading">Loading…</div>;

  return (
    <div>
      <div className="filters">
        <input className="text-input" placeholder="Search by subject or section…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="text-input" value={exam} onChange={(e) => setExam(e.target.value)} aria-label="Exam">
          <option value="">All exams</option>
          {data.exams.map((e) => (
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
        {nf(data.total)} {data.total === 1 ? "paper has" : "papers have"} been sat at least once. Click one to see who sat it.
      </p>

      <div className={loading ? "table-wrap is-loading" : "table-wrap"}>
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
            {data.tests.map((t) => {
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
            {data.tests.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)" }}>No papers match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pager page={data.page} pages={data.pages} total={data.total} noun="papers" loading={loading} onPage={setPage} />
    </div>
  );
}
