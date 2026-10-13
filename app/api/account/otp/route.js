import { NextResponse } from "next/server";
import { authConfigured, otpChannelEnabled } from "@/lib/auth";
import { LIMITS, rateLimit, clientIp, tooManyResponse } from "@/lib/rate-limit";
import { otpTarget, issueOtp, OTP_TTL_MIN } from "@/lib/otp";
import { sendOtpSms } from "@/lib/sms";
import { sendOtpEmail } from "@/lib/mail";
import { findUserByPhone, findUserByEmail } from "@/lib/users";

export const dynamic = "force-dynamic";

// Sends a one-time sign-in code to a mobile number (SMS) or an email address.
// The code itself is checked by next-auth's "otp" provider (lib/auth.js).
// `error` is a code the form translates, not a sentence.
export async function POST(request) {
  if (!authConfigured()) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const allowed = await rateLimit(LIMITS.otpSend, clientIp(request));
  if (!allowed.ok) return tooManyResponse(allowed);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "generic" }, { status: 400 });
  }

  const channel = body?.channel;
  if (!otpChannelEnabled(channel)) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  const dest = otpTarget(channel, body?.to);
  if (!dest) return NextResponse.json({ error: channel }, { status: 400 });

  try {
    const issued = await issueOtp(dest.target);
    if (issued.error) {
      return NextResponse.json({ error: issued.error === "wait" ? "otpWait" : "tooMany" }, { status: 429 });
    }
    try {
      if (channel === "phone") await sendOtpSms(dest.to, issued.code);
      else await sendOtpEmail(dest.to, issued.code, OTP_TTL_MIN);
    } catch (e) {
      console.error("[otp] code not sent:", e.message);
      return NextResponse.json({ error: channel === "phone" ? "sms" : "mail" }, { status: 502 });
    }
    // Someone with no account yet is asked for the candidate's name as well.
    const existing =
      channel === "phone" ? await findUserByPhone(dest.to) : await findUserByEmail(dest.to);
    return NextResponse.json({ ok: true, isNew: !existing });
  } catch {
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }
}
