"use client";

import { fmtDateTime } from "./format";
import { usePagedFetch, Pager, usePage } from "./paging";

// Questions candidates have flagged as wrong or unclear, newest first.
export default function ReportsTab() {
  const [page, setPage] = usePage({});
  const { data, error, loading } = usePagedFetch(`/api/admin/reports?page=${page}`);

  if (error && !data) return <div className="loading">{error}</div>;
  if (!data) return <div className="loading">Loading…</div>;
  if (data.total === 0) return <div className="loading">No questions have been reported.</div>;

  return (
    <div>
      <div className={loading ? "table-wrap is-loading" : "table-wrap"}>
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
            {data.reports.map((r) => (
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

      <Pager page={data.page} pages={data.pages} total={data.total} noun="reports" newer loading={loading} onPage={setPage} />
    </div>
  );
}
