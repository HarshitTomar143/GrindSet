import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isTokenValid, ADMIN_COOKIE } from "@/lib/admin";
import { listReports } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!isTokenValid(cookies().get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await listReports({ page: new URL(request.url).searchParams.get("page") }));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
