"use client";

import { useEffect, useState } from "react";
import ActivityChart from "./ActivityChart";
import { loadView, nf } from "./format";

const RANGES = [7, 30, 90];

function Tile({ i, num, label, note }) {
  return (
    <div className="admin-card" style={{ "--i": i }}>
      <div className="ac-num">{num}</div>
      <div className="ac-label">{label}</div>
      {note && <div className="muted-sm" style={{ marginTop: 6 }}>{note}</div>}
    </div>
  );
}

export default function OverviewTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    loadView({ view: "overview", days })
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [days]);

  if (error) return <div className="loading">{error}</div>;
  if (!data) return <div className="loading">Loading…</div>;

  const { totals: t, users: u, exams } = data;
  const people = (n) => `${nf(n)} ${n === 1 ? "person" : "people"}`;
  const maxPapers = Math.max(...exams.map((e) => e.papers), 1);
  const methods = [
    ["Google", u.google],
    ["Password", u.password],
    ["Mobile OTP", u.phone],
    ["Email code only", u.email_code],
  ].filter(([, n]) => n > 0);

  return (
    <div>
      <div className="admin-cards">
        <Tile i={0} num={nf(t.papers_today)} label="Papers today" note={people(t.people_today)} />
        <Tile i={1} num={nf(t.papers_7d)} label="Last 7 days" note={people(t.people_7d)} />
        <Tile i={2} num={nf(t.papers_30d)} label="Last 30 days" note={people(t.people_30d)} />
        <Tile i={3} num={nf(t.papers)} label="Papers, all time" note={`${people(t.people)} · ${nf(t.tests)} different papers`} />
        <Tile i={4} num={`${t.avg_pct}%`} label="Average score" note="across every paper" />
        <Tile
          i={5}
          num={nf(u.accounts)}
          label="Registered accounts"
          note={`${nf(u.accounts_7d)} new this week · ${nf(t.papers_signed_in)} papers sat signed in`}
        />
      </div>

      <ActivityChart daily={data.daily} ranges={RANGES} days={data.days} onDays={setDays} />

      <h2 className="section-h">By exam</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Exam</th>
              <th style={{ width: "45%" }}>Papers sat</th>
              <th>People</th>
              <th>Avg %</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((e) => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.name}</td>
                <td>
                  <div className="admin-meter">
                    <span style={{ width: `${Math.max(1, (e.papers / maxPapers) * 100)}%` }} />
                    <b>{nf(e.papers)}</b>
                  </div>
                </td>
                <td>{nf(e.people)}</td>
                <td>{e.avg_pct}%</td>
              </tr>
            ))}
            {exams.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)" }}>No papers submitted yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {methods.length > 0 && (
        <p className="muted-sm" style={{ marginTop: 14 }}>
          Accounts by sign-in method: {methods.map(([name, n]) => `${name} ${nf(n)}`).join(" · ")}. An account
          with two methods is counted under both.
        </p>
      )}
      <p className="muted-sm" style={{ marginTop: 6 }}>
        Only submitted papers are counted; a paper opened and abandoned leaves no record. People who are not signed
        in are told apart by the email or name they typed.
      </p>
    </div>
  );
}
