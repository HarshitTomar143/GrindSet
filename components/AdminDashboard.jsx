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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "mock-paper";
}

async function downloadMockPaperAsJson(test) {
  try {
    const manifestRes = await fetch("/api/manifest");
    const manifest = await manifestRes.json();
    if (manifest.error) throw new Error(manifest.error);

    const section = manifest.sections.find((s) => s.name === test.section_name);
    const group = section?.groups.find((g) =>
      g.subjects.some((s) => s.name === test.subject_name)
    );
    const subject = group?.subjects.find((s) => s.name === test.subject_name);

    if (!section || !group || !subject) {
      throw new Error("Could not find this mock paper in the manifest.");
    }

    const res = await fetch(
      `/api/quiz?section=${section.id}&group=${group.id}&subject=${subject.id}&mock=${test.mock_num}`
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const payload = {
      section: section.name,
      group: group.name,
      subject: subject.name,
      mock: test.mock_num,
      questions: (data.questions || []).map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correct,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(section.name)}-${slugify(group.name)}-${slugify(subject.name)}-mock-${test.mock_num}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert(e.message || "Failed to download mock paper.");
  }
}

export default function AdminDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState(null);
  const [reports, setReports] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    (async () => {
      try {
        const [s, l, rep, man] = await Promise.all([
          fetch("/api/admin/summary").then((r) => r.json()),
          fetch("/api/admin/submissions").then((r) => r.json()),
          fetch("/api/admin/reports").then((r) => r.json()),
          fetch("/api/manifest").then((r) => r.json()),
        ]);
        if (s.error) throw new Error(s.error);
        if (l.error) throw new Error(l.error);
        if (man.error) throw new Error(man.error);
        setSummary(s);
        setRows(l.submissions);
        setReports(rep.reports || []);
        setManifest(man);
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

      <div style={{ marginBottom: 24 }}>
        <button
          type="button"
          className="btn"
          onClick={() => setDownloadOpen((open) => !open)}
        >
          Download paper
        </button>
        {downloadOpen && manifest && (
          <div
            style={{
              marginTop: 16,
              border: "1px solid rgba(120, 130, 170, 0.24)",
              borderRadius: 14,
              padding: 16,
            }}
          >
            {manifest.sections.map((section) => (
              <div key={section.id} style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setExpandedSection((current) =>
                      current === section.id ? null : section.id
                    );
                    setExpandedGroup(null);
                    setExpandedSubject(null);
                  }}
                >
                  {section.name}
                </button>
                {expandedSection === section.id && (
                  <div style={{ marginLeft: 16, marginTop: 12 }}>
                    {section.groups.map((group) => (
                      <div key={group.id} style={{ marginBottom: 14 }}>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            setExpandedGroup((current) =>
                              current === group.id ? null : group.id
                            );
                            setExpandedSubject(null);
                          }}
                        >
                          {group.name}
                        </button>
                        {expandedGroup === group.id && (
                          <div style={{ marginLeft: 16, marginTop: 12 }}>
                            {group.subjects.map((subject) => {
                              const subjectKey = `${section.id}|${group.id}|${subject.id}`;
                              return (
                                <div key={subject.id} style={{ marginBottom: 12 }}>
                                  <button
                                    type="button"
                                    className="btn ghost"
                                    onClick={() =>
                                      setExpandedSubject((current) =>
                                        current === subjectKey ? null : subjectKey
                                      )
                                    }
                                  >
                                    {subject.name}
                                  </button>
                                  {expandedSubject === subjectKey && (
                                    <div
                                      style={{
                                        marginLeft: 16,
                                        marginTop: 12,
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                                        gap: 8,
                                      }}
                                    >
                                      {Array.from({ length: subject.mocks }, (_, index) => (
                                        <button
                                          key={index}
                                          type="button"
                                          className="btn ghost"
                                          onClick={() =>
                                            downloadMockPaperAsJson({
                                              section_id: section.id,
                                              group_id: group.id,
                                              subject_id: subject.id,
                                              section_name: section.name,
                                              group_name: group.name,
                                              subject_name: subject.name,
                                              mock_num: index + 1,
                                            })
                                          }
                                        >
                                          Mock {index + 1}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-cards">
        <div className="admin-card" style={{ "--i": 0 }}>
          <div className="ac-num">{summary.total}</div>
          <div className="ac-label">Submissions</div>
        </div>
        <div className="admin-card" style={{ "--i": 1 }}>
          <div className="ac-num">{summary.takers}</div>
          <div className="ac-label">Test-takers</div>
        </div>
        <div className="admin-card" style={{ "--i": 2 }}>
          <div className="ac-num">{summary.avg_pct}%</div>
          <div className="ac-label">Average score</div>
        </div>
        <div className="admin-card" style={{ "--i": 3 }}>
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
                  <th>Export</th>
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
                    <td>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadMockPaperAsJson(t);
                        }}
                      >
                        Download JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {reports && reports.length > 0 && (
        <>
          <h2 className="section-h">
            Reported questions ({reports.length})
          </h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Q#</th>
                  <th>Reason</th>
                  <th>Question</th>
                  <th>By</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.section_name} · {r.subject_name}
                      <div className="muted-sm">Mock {r.mock_num}</div>
                    </td>
                    <td>{r.question_index != null ? r.question_index + 1 : "—"}</td>
                    <td>
                      <span className="tag wrong">{r.reason || "—"}</span>
                    </td>
                    <td
                      style={{
                        whiteSpace: "normal",
                        maxWidth: 360,
                        minWidth: 220,
                      }}
                    >
                      {r.question_text}
                      {r.note && (
                        <div className="muted-sm" style={{ marginTop: 4 }}>
                          “{r.note}”
                        </div>
                      )}
                    </td>
                    <td className="muted-sm">{r.reporter_name || "—"}</td>
                    <td className="muted-sm">{fmtDate(r.created_at)}</td>
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
              <th>Export</th>
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
                <td>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadMockPaperAsJson(r);
                    }}
                  >
                    Download JSON
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", color: "var(--muted)" }}>
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
