import { NextResponse } from "next/server";
import { checkPassword, expectedToken, adminConfigured, ADMIN_COOKIE } from "@/lib/admin";
import { LIMITS, rateLimit, clearRateLimit, clientIp, tooManyResponse } from "@/lib/rate-limit";

export async function POST(request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Admin is not configured. Set ADMIN_PASSWORD in your env file." },
      { status: 503 }
    );
  }
  const ip = clientIp(request);
  const allowed = await rateLimit(LIMITS.adminLogin, ip);
  if (!allowed.ok) return tooManyResponse(allowed, "Too many attempts. Try again in a few minutes.");

  const { password } = await request.json().catch(() => ({}));
  if (!checkPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  await clearRateLimit(LIMITS.adminLogin, ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
