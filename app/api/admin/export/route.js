import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isTokenValid, ADMIN_COOKIE } from "@/lib/admin";
import { exportSubmissions } from "@/lib/admin-stats";

export const dynamic = "force-dynamic";

// A leading =, +, - or @ would be run as a formula by a spreadsheet.
function cell(v) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// "2026-10-09 20:28" in India time: unambiguous, and sorts as text.
function istStamp(d) {
  return new Date(new Date(d).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ");
}

const COLUMNS = [
  ["Date (IST)", (r) => istStamp(r.created_at)],
  ["Name", (r) => r.name],
  ["Email", (r) => r.email],
  ["Signed in", (r) => (r.user_id ? "yes" : "no")],
  ["Exam", (r) => r.exam],
  ["Section", (r) => r.section_name],
  ["Subject", (r) => r.subject_name],
  ["Mock", (r) => r.mock_num],
  ["Total", (r) => r.total],
  ["Correct", (r) => r.correct],
  ["Wrong", (r) => r.wrong],
  ["Skipped", (r) => r.skipped],
  ["Percentage", (r) => r.percentage],
  ["Seconds", (r) => r.duration_seconds],
];

// The submissions list as a CSV file, with the same filters as the table.
export async function GET(request) {
  if (!isTokenValid(cookies().get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const p = new URL(request.url).searchParams;
  try {
    const rows = await exportSubmissions({
      q: (p.get("q") || "").trim().slice(0, 100),
      exam: p.get("exam"),
      person: p.get("person"),
      test: p.get("test"),
      sort: p.get("sort"),
    });
    const lines = [COLUMNS.map(([h]) => h).join(",")];
    for (const r of rows) lines.push(COLUMNS.map(([, get]) => cell(get(r))).join(","));
    // The BOM makes Excel read the Hindi names as UTF-8.
    return new NextResponse("﻿" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="submissions-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
