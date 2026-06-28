import { NextResponse } from "next/server";
import { getMockQuestions, getFullMockQuestions } from "@/lib/data";

export const dynamic = "force-dynamic";

const SUBJECT_LABELS = {
  "child-development-pedagogy": "Child Development & Pedagogy",
  english: "English",
  "environmental-studies": "Environmental Studies",
  hindi: "Hindi",
  mathematics: "Mathematics",
  sanskrit: "Sanskrit",
  "mathematics-science": "Mathematics & Science",
  "social-studies": "Social Studies",
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section");
  const group = searchParams.get("group");
  const subject = searchParams.get("subject");
  const mock = parseInt(searchParams.get("mock") || "1", 10);
  const language = searchParams.get("lang") || "english";
  const stream = searchParams.get("stream") || "science";

  if (!section || !group || !subject || !mock || mock < 1) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    let questions =
      subject === "paper1-full" || subject === "paper2-full"
        ? await getFullMockQuestions(section, mock, { language, stream })
        : await getMockQuestions(section, group, subject, mock);

    const subjectName = SUBJECT_LABELS[subject] || null;
    if (subjectName) {
      questions = questions.map((q) => ({ ...q, subjectName: q.subjectName || subjectName }));
    }

    return NextResponse.json({ questions });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
