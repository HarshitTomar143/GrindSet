import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isTokenValid, ADMIN_COOKIE } from "@/lib/admin";
import { getManifest, getMockQuestions } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isTokenValid(cookies().get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const manifest = await getManifest();
    const papers = [];

    for (const section of manifest.sections) {
      for (const group of section.groups) {
        for (const subject of group.subjects) {
          for (let mockNum = 1; mockNum <= subject.mocks; mockNum++) {
            const questions = await getMockQuestions(
              section.id,
              group.id,
              subject.id,
              mockNum
            );
            papers.push({
              section: section.name,
              group: group.name,
              subject: subject.name,
              mock: mockNum,
              questions,
            });
          }
        }
      }
    }

    return NextResponse.json({ papers });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
