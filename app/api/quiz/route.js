import { NextResponse } from "next/server";
import { getMockQuestions } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section");
  const group = searchParams.get("group");
  const subject = searchParams.get("subject");
  const mock = parseInt(searchParams.get("mock") || "1", 10);

  if (!section || !group || !subject || !mock || mock < 1) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    const questions = await getMockQuestions(section, group, subject, mock);
    return NextResponse.json({ questions });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
