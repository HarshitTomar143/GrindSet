import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isTokenValid, ADMIN_COOKIE } from "@/lib/admin";
import {
  getOverview,
  getTestStats,
  getPeople,
  findSubmissions,
  EXAMS,
  RANGE_DAYS,
} from "@/lib/admin-stats";

export const dynamic = "force-dynamic";

// Data for one tab of the admin panel, picked with ?view=.
export async function GET(request) {
  if (!isTokenValid(cookies().get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const p = new URL(request.url).searchParams;
  try {
    switch (p.get("view")) {
      case "overview": {
        const days = parseInt(p.get("days"), 10);
        return NextResponse.json(await getOverview(RANGE_DAYS.includes(days) ? days : 30));
      }
      case "tests":
        return NextResponse.json({ tests: await getTestStats() });
      case "people":
        return NextResponse.json({ people: await getPeople() });
      case "submissions":
        return NextResponse.json({
          exams: EXAMS,
          ...(await findSubmissions({
            q: (p.get("q") || "").trim().slice(0, 100),
            exam: p.get("exam"),
            person: p.get("person"),
            test: p.get("test"),
            sort: p.get("sort"),
            page: parseInt(p.get("page"), 10) || 1,
          })),
        });
      default:
        return NextResponse.json({ error: "Unknown view" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
