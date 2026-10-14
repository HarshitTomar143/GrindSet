"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadView, nf, fmtTime, fmtDateTime, pctClass } from "./format";

/**
 * Every finished paper, a page at a time. `scope` narrows it to one person or
 * one paper - set by clicking a row in the People or Papers tab.
 */
export default function SubmissionsTab({ scope, onClearScope }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [exam, setExam] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  // Search as the admin types, but not on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(input.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => setPage(1), [scope]);

  const filters = { q, exam, sort, ...(scope?.person && { person: scope.person }), ...(scope?.test && { test: scope.test }) };
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    let live = true;
    loadView({ view: "submissions", ...JSON.parse(filterKey), page })
      .then((d) => live && (setData(d), setError(null)))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [filterKey, page]);

  if (error) return <div className="loading">{error}</div>;
  if (!data) return <div className="loading">Loading…</div>;

  return (
    <div>
      {scope && (
        <div className="admin-scope">
          <div>
            <div className="muted-sm">{scope.person ? "Record of" : "Everyone who sat"}</div>
            <b>{scope.label}</b>
            <span className="muted-sm">
              {" "}· {nf(data.total)} {data.total === 1 ? "paper" : "papers"}
              {data.total > 0 && ` · average ${data.avg_pct}% · best ${data.best_pct}%`}
            </span>
          </div>
          <button type="button" className="btn ghost" onClick={onClearScope}>
            Show everyone
          </button>
        </div>
      )}

      <div className="filters">
        <input className="text-input" placeholder="Search by name, email or subject…" value={input} onChange={(e) => setInput(e.target.value)} />
        <select className="text-input" value={exam} onChange={(e) => { setExam(e.target.value); setPage(1); }} aria-label="Exam">
          <option value="">All exams</option>
          {data.exams.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <select className="text-input" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest score</option>
          <option value="lowest">Lowest score</option>
        </select>
        <a className="btn ghost" href={`/api/admin/export?${new URLSearchParams(filters)}`}>
          Download CSV
        </a>
      </div>
      <p className="muted-sm" style={{ marginBottom: 10 }}>
        {nf(data.total)} {data.total === 1 ? "submission" : "submissions"}
        {!scope && data.total > 0 && ` · average ${data.avg_pct}%`}. Click one to see the answers.
      </p>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Paper</th>
              <th>Score</th>
              <th>%</th>
              <th>✓</th>
              <th>✗</th>
              <th>—</th>
              <th>Time</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {data.submissions.map((r) => (
              <tr key={r.id} className="row-link" onClick={() => router.push(`/admin/submission/${r.id}`)}>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div className="muted-sm">{[r.email, r.user_id ? "signed in" : null].filter(Boolean).join(" · ")}</div>
                </td>
                <td>
                  {r.subject_name} · Mock {r.mock_num}
                  <div className="muted-sm">{r.exam} · {r.section_name}</div>
                </td>
                <td>{r.correct}/{r.total}</td>
                <td><span className={`tag ${pctClass(r.percentage)}`}>{r.percentage}%</span></td>
                <td>{r.correct}</td>
                <td>{r.wrong}</td>
                <td>{r.skipped}</td>
                <td>{fmtTime(r.duration_seconds)}</td>
                <td className="muted-sm">{fmtDateTime(r.created_at)}</td>
              </tr>
            ))}
            {data.submissions.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", color: "var(--muted)" }}>No submissions match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.pages > 1 && (
        <div className="admin-pager">
          <button type="button" className="btn ghost" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>
            ← Newer
          </button>
          <span className="muted-sm">Page {data.page} of {data.pages}</span>
          <button type="button" className="btn ghost" disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)}>
            Older →
          </button>
        </div>
      )}
    </div>
  );
}
