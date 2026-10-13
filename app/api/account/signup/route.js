import { NextResponse } from "next/server";
import { authConfigured } from "@/lib/auth";
import { LIMITS, rateLimit, clientIp, tooManyResponse } from "@/lib/rate-limit";
import {
  createPasswordUser,
  normalizeEmail,
  isValidEmail,
  PASSWORD_MIN,
  PASSWORD_MAX,
  NAME_MAX,
} from "@/lib/users";

export const dynamic = "force-dynamic";

// Creates a password account. The client signs in straight afterwards through
// next-auth, so this route never sets a cookie itself. `error` is a code the
// form translates, not a sentence.
export async function POST(request) {
  if (!authConfigured()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const allowed = await rateLimit(LIMITS.signup, clientIp(request));
  if (!allowed.ok) return tooManyResponse(allowed);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "generic" }, { status: 400 });
  }

  const name = String(body?.name || "").trim().replace(/\s+/g, " ");
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || "");

  if (!name || name.length > NAME_MAX) {
    return NextResponse.json({ error: "name" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return NextResponse.json({ error: "password" }, { status: 400 });
  }

  try {
    const result = await createPasswordUser({ name, email, password });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
