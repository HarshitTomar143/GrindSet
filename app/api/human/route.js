import { NextResponse } from "next/server";
import { captchaEnabled, verifyCaptcha, humanPass } from "@/lib/human-check";
import { LIMITS, rateLimit, clientIp, tooManyResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Checks a solved Turnstile widget and hands back the pass cookie
// (lib/human-check.js). Posted by components/HumanCheck.jsx.
export async function POST(request) {
  if (!captchaEnabled()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const ip = clientIp(request);
  const allowed = await rateLimit(LIMITS.humanCheck, ip);
  if (!allowed.ok) return tooManyResponse(allowed);

  const body = await request.json().catch(() => ({}));
  if (!(await verifyCaptcha(body?.token, ip))) {
    return NextResponse.json({ error: "captcha" }, { status: 400 });
  }

  const pass = humanPass(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(pass.name, pass.value, pass.options);
  return res;
}
