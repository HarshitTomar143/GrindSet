import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isTokenValid, ADMIN_COOKIE } from "@/lib/admin";
import { listSubmissions } from "@/lib/submissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isTokenValid(cookies().get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ submissions: await listSubmissions() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
