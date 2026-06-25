"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function fmtTime(s) {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}
function fmtDate(d) {
  return new Date(d).toLocaleString();
}
function pctClass(p) {
  if (p >= 60) return "correct";
  if (p >= 35) return "skipped";
  return "wrong";
}

export default function AdminDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    (async () => {
      try {
        const [s, l] = await Promise.all([
          fetch("/api/admin/summary").then((r) => r.json()),
          fetch("/api/admin/submissions").then((r) => r.json()),
        ]);
        if (s.error) throw new Error(s.error);
        if (l.error) throw new Error(l.error);
        setSummary(s);
        setRows(l.submissions);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  const sections = useMemo(() => {
    if (!rows) return [];
    return [...new Set(rows.map((r) => r.section_name))];
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    let out = rows.filter((r) => {
      const matchSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.email || "").toLowerCase().includes(search.toLowerCase());
      const matchSection =
        sectionFilter === "all" || r.section_name === sectionFilter;
      return matchSearch && matchSection;
    });
    out = [...out].sort((a, b) => {
      if (sort === "highest") return b.percentage - a.percentage;
      if (sort === "lowest") return a.percentage - b.percentage;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return out;
  }, [rows, search, sectionFilter, sort]);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  };

  if (error)
    return (
      <div className="loading">
        {error} — <a href="/admin">retry</a>
      </div>
    );
  if (!summary || !rows) return <div className="loading">Loading activity…</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Activity dashboard
        </h1>
        <button className="btn ghost" onClick={logout}>
          Sign out
        </button>
      </div>
      <p className="page-sub" style={{ marginTop: 6 }}>
        Every test submission, who took it, and how they scored.
      </p>

      <div className="admin-cards">
        <div className="admin-card">
          <div className="ac-num">{summary.total}</div>
          <div className="ac-label">Submissions</div>
        </div>
        <div className="admin-card">
          <div className="ac-num">{summary.takers}</div>
          <div className="ac-label">Test-takers</div>
        </div>
        <div className="admin-card">
          <div className="ac-num">{summary.avg_pct}%</div>
          <div className="ac-label">Average score</div>
        </div>
        <div className="admin-card">
          <div className="ac-num">{summary.tests_attempted}</div>
          <div className="ac-label">Distinct tests</div>
        </div>
      </div>

      {summary.perTest.length > 0 && (
        <>
          <h2 className="section-h">Most attempted tests</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Attempts</th>
                  <th>Avg %</th>
                  <th>Best %</th>
                </tr>
              </thead>
              <tbody>
                {summary.perTest.map((t, i) => (
                  <tr key={i}>
                    <td>
                      {t.section_name} · {t.subject_name} · Mock {t.mock_num}
                    </td>
                    <td>{t.attempts}</td>
                    <td>{t.avg_pct}%</td>
                    <td>{t.best_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="section-h">All submissions ({filtered.length})</h2>
      <div className="filters">
        <input
          className="text-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="text-input"
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
        >
          <option value="all">All papers</option>
          {sections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="text-input"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="highest">Highest score</option>
          <option value="lowest">Lowest score</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Test</th>
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
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="row-link"
                onClick={() => router.push(`/admin/submission/${r.id}`)}
              >
                <td>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  {r.email && <div className="muted-sm">{r.email}</div>}
                </td>
                <td>
                  {r.section_name} · {r.subject_name}
                  <div className="muted-sm">Mock {r.mock_num}</div>
                </td>
                <td>
                  {r.correct}/{r.total}
                </td>
                <td>
                  <span className={`tag ${pctClass(r.percentage)}`}>
                    {r.percentage}%
                  </span>
                </td>
                <td>{r.correct}</td>
                <td>{r.wrong}</td>
                <td>{r.skipped}</td>
                <td>{fmtTime(r.duration_seconds)}</td>
                <td className="muted-sm">{fmtDate(r.created_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", color: "var(--muted)" }}>
                  No submissions match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
