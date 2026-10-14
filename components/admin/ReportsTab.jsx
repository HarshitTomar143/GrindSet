"use client";

import { useEffect, useState } from "react";
import { fmtDateTime } from "./format";

// Questions candidates have flagged as wrong or unclear.
export default function ReportsTab() {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/admin/reports")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setReports(d.reports || [])))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="loading">{error}</div>;
  if (!reports) return <div className="loading">Loading…</div>;
  if (reports.length === 0) return <div className="loading">No questions have been reported.</div>;

  return (
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
              <td style={{ whiteSpace: "normal", maxWidth: 360, minWidth: 220 }}>
                {r.question_text}
                {r.note && (
                  <div className="muted-sm" style={{ marginTop: 4 }}>
                    “{r.note}”
                  </div>
                )}
              </td>
              <td className="muted-sm">{r.reporter_name || "—"}</td>
              <td className="muted-sm">{fmtDateTime(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
