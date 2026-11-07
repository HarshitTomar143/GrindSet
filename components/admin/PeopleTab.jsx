"use client";

import { useState } from "react";
import { nf, fmtDate, ago, pctClass } from "./format";
import { usePagedFetch, viewUrl, Pager, useDebounced, usePage } from "./paging";

/** Everyone who has sat a paper, plus accounts that haven't, a page at a time. */
export default function PeopleTab({ onOpen }) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [sort, setSort] = useState("recent");
  const q = useDebounced(search.trim());
  const [page, setPage] = usePage({ q, kind, sort });

  const { data, error, loading } = usePagedFetch(viewUrl({ view: "people", q, kind, sort, page }));

  if (error && !data) return <div className="loading">{error}</div>;
  if (!data) return <div className="loading">Loading…</div>;

  const { everyone, accounts } = data.counts;

  return (
    <div>
      <div className="filters">
        <input className="text-input" placeholder="Search by name, email or mobile…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="text-input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Who">
          <option value="">Everyone ({nf(everyone)})</option>
          <option value="accounts">Registered accounts ({nf(accounts)})</option>
          <option value="guests">Not signed in ({nf(everyone - accounts)})</option>
        </select>
        <select className="text-input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="recent">Recently active</option>
          <option value="papers">Most papers</option>
          <option value="best">Highest average</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      <p className="muted-sm" style={{ marginBottom: 10 }}>
        {nf(data.total)} {data.total === 1 ? "person" : "people"}. Click a person to see every paper they have sat.
      </p>

      <div className={loading ? "table-wrap is-loading" : "table-wrap"}>
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Account</th>
              <th>Papers</th>
              <th>Avg %</th>
              <th>Best %</th>
              <th>Exams</th>
              <th>First seen</th>
              <th>Last active</th>
            </tr>
          </thead>
          <tbody>
            {data.people.map((p) => (
              <tr
                key={p.key}
                className={p.papers ? "row-link" : undefined}
                onClick={p.papers ? () => onOpen({ person: p.key, label: p.name }) : undefined}
              >
                <td>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  {(p.email || p.phone) && (
                    <div className="muted-sm">{[p.email, p.phone].filter(Boolean).join(" · ")}</div>
                  )}
                </td>
                <td>
                  {p.account ? (
                    <>
                      <span className="tag correct">{p.account.signIn}</span>
                      <div className="muted-sm">joined {fmtDate(p.account.joined_at)}</div>
                    </>
                  ) : (
                    <span className="muted-sm">Not signed in</span>
                  )}
                </td>
                <td>
                  {nf(p.papers)}
                  {p.tests > 0 && p.tests !== p.papers && <div className="muted-sm">{nf(p.tests)} different</div>}
                </td>
                <td>{p.avg_pct == null ? "—" : <span className={`tag ${pctClass(p.avg_pct)}`}>{p.avg_pct}%</span>}</td>
                <td>{p.best_pct == null ? "—" : `${p.best_pct}%`}</td>
                <td className="muted-sm">{p.exams.join(", ") || "—"}</td>
                <td className="muted-sm">{fmtDate(p.first_at || p.account?.joined_at)}</td>
                <td className="muted-sm">{p.last_at ? ago(p.last_at) : "no papers yet"}</td>
              </tr>
            ))}
            {data.people.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)" }}>Nobody matches.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pager page={data.page} pages={data.pages} total={data.total} noun="people" loading={loading} onPage={setPage} />
    </div>
  );
}
