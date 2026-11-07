import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isTokenValid, ADMIN_COOKIE } from "./admin";

/** A 401 response when the caller is not signed in to /admin, else null. */
export function requireAdmin() {
  if (isTokenValid(cookies().get(ADMIN_COOKIE)?.value)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
