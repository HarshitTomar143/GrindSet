import { NextResponse } from "next/server";
import { recordReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const b = await request.json();
    if (!b.questionText || !String(b.questionText).trim()) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }
    const id = await recordReport({
      sectionId: b.sectionId || null,
      sectionName: b.sectionName || null,
      subjectId: b.subjectId || null,
      subjectName: b.subjectName || null,
      mock: Number.isFinite(b.mock) ? b.mock : null,
      questionIndex: Number.isFinite(b.questionIndex) ? b.questionIndex : null,
      questionText: String(b.questionText).slice(0, 2000),
      reason: b.reason ? String(b.reason).slice(0, 80) : null,
      note: b.note ? String(b.note).slice(0, 1000) : null,
      reporterName: b.name ? String(b.name).slice(0, 120) : null,
      reporterEmail: b.email ? String(b.email).slice(0, 160) : null,
    });
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
