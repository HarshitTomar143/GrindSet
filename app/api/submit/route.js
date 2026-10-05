import { NextResponse } from "next/server";
import { recordSubmission } from "@/lib/submissions";
import { getAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    // A signed-in candidate's result carries the account's own name and email,
    // whatever the page sent, and is tied to the account.
    const account = await getAccount();
    if (account) {
      body.name = account.name;
      body.email = account.email;
    }
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const id = await recordSubmission({
      name: String(body.name).trim().slice(0, 120),
      email: body.email ? String(body.email).trim().slice(0, 160) : null,
      sectionId: body.sectionId,
      sectionName: body.sectionName,
      groupId: body.groupId,
      groupName: body.groupName,
      subjectId: body.subjectId,
      subjectName: body.subjectName,
      mock: body.mock,
      total: body.total,
      correct: body.correct,
      wrong: body.wrong,
      skipped: body.skipped,
      percentage: body.percentage,
      duration: body.duration,
      answers: body.answers,
      userId: account?.id || null,
    });
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
