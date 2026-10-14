"use client";

import { useEffect, useMemo, useState } from "react";
import { loadView, nf, fmtDate, ago, pctClass } from "./format";

const SORTS = {
  recent: (a, b) => new Date(b.last_at || b.account?.joined_at || 0) - new Date(a.last_at || a.account?.joined_at || 0),
  papers: (a, b) => b.papers - a.papers,
  best: (a, b) => (b.avg_pct ?? -1) - (a.avg_pct ?? -1),
  name: (a, b) => a.name.localeCompare(b.name),
};

export default function PeopleTab({ onOpen }) {
  const [people, setPeople] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    loadView({ view: "people" })
      .then((d) => setPeople(d.people))
      .catch((e) => setError(e.message));
  }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (people || [])
      .filter((p) => kind === "all" || (kind === "accounts" ? p.account : !p.account))
      .filter((p) => !q || `${p.name} ${p.email || ""} ${p.phone || ""}`.toLowerCase().includes(q))
      .sort(SORTS[sort]);
  }, [people, search, kind, sort]);

  if (error) return <div className="loading">{error}</div>;
  if (!people) return <div className="loading">Loading…</div>;

  const accounts = people.filter((p) => p.account).length;

  return (
    <div>
      <div className="filters">
        <input className="text-input" placeholder="Search by name, email or mobile…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="text-input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Who">
          <option value="all">Everyone ({nf(people.length)})</option>
          <option value="accounts">Registered accounts ({nf(accounts)})</option>
          <option value="guests">Not signed in ({nf(people.length - accounts)})</option>
        </select>
        <select className="text-input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="recent">Recently active</option>
          <option value="papers">Most papers</option>
          <option value="best">Highest average</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      <p className="muted-sm" style={{ marginBottom: 10 }}>
        Showing {nf(shown.length)}. Click a person to see every paper they have sat.
      </p>

      <div className="table-wrap">
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
            {shown.map((p) => (
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
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)" }}>Nobody matches.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
