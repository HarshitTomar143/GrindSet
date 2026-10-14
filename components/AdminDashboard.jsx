"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OverviewTab from "@/components/admin/OverviewTab";
import TestsTab from "@/components/admin/TestsTab";
import PeopleTab from "@/components/admin/PeopleTab";
import SubmissionsTab from "@/components/admin/SubmissionsTab";
import ReportsTab from "@/components/admin/ReportsTab";
import PaperDownload from "@/components/admin/PaperDownload";

const TABS = [
  { id: "overview", label: "Overview", sub: "How much the site is being used." },
  { id: "tests", label: "Papers", sub: "Which papers are being sat, and how people score on them." },
  { id: "people", label: "People", sub: "Everyone who has sat a paper, and every registered account." },
  { id: "submissions", label: "Submissions", sub: "Every finished paper, who sat it, and how they scored." },
  { id: "reports", label: "Reported questions", sub: "Questions candidates have flagged." },
];
// Coming back from a submission's page lands on the tab it was opened from.
const STORE = "admin-view";

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  // { person | test, label }: narrows the Submissions tab to one person or paper.
  const [scope, setScope] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) || "null");
      if (saved && TABS.some((t) => t.id === saved.tab)) {
        setTab(saved.tab);
        setScope(saved.scope || null);
      }
    } catch {}
  }, []);

  const show = (nextTab, nextScope = scope) => {
    setTab(nextTab);
    setScope(nextScope);
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ tab: nextTab, scope: nextScope }));
    } catch {}
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  };

  const current = TABS.find((t) => t.id === tab);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Admin
        </h1>
        <button className="btn ghost" onClick={logout}>
          Sign out
        </button>
      </div>

      <div className="admin-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab}
            className={t.id === tab ? "active" : ""}
            onClick={() => show(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="page-sub" style={{ marginTop: 0 }}>{current.sub}</p>

      {tab === "overview" && <OverviewTab />}
      {tab === "tests" && (
        <>
          <PaperDownload />
          <TestsTab onOpen={(s) => show("submissions", s)} />
        </>
      )}
      {tab === "people" && <PeopleTab onOpen={(s) => show("submissions", s)} />}
      {tab === "submissions" && <SubmissionsTab scope={scope} onClearScope={() => show("submissions", null)} />}
      {tab === "reports" && <ReportsTab />}
    </div>
  );
}
