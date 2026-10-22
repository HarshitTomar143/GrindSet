/**
 * Sends the one-time sign-in code by email, through Resend (resend.com).
 *
 *   RESEND_API_KEY   an API key from the Resend dashboard
 *   EMAIL_FROM       the sender, on a domain verified in Resend, e.g.
 *                    "PYQSetu <login@your-domain>". Without it Resend's test
 *                    sender is used, which only delivers to the address the
 *                    Resend account itself was opened with.
 *
 * With no key set, a development server prints the code to its own console so
 * the flow can be tried without sending anything; in production the email-code
 * option is simply not offered.
 */

const TEST_SENDER = "PYQSetu <onboarding@resend.dev>";

export function emailOtpEnabled() {
  return Boolean(process.env.RESEND_API_KEY) || process.env.NODE_ENV !== "production";
}

/** Throws if Resend refuses the message. */
export async function sendOtpEmail(email, code, minutes) {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set");
    console.log(`[otp] ${email} -> ${code} (RESEND_API_KEY not set; development only)`);
    return;
  }

  const lines = [
    `आपका PYQSetu साइन इन कोड: ${code}`,
    `यह कोड ${minutes} मिनट तक मान्य है। इसे किसी के साथ साझा न करें।`,
    "",
    `Your PYQSetu sign-in code: ${code}`,
    `It is valid for ${minutes} minutes. Do not share it with anyone.`,
    "",
    "If you did not ask for this code, you can ignore this email.",
  ];
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || TEST_SENDER,
      to: [email],
      subject: `${code} - PYQSetu sign-in code`,
      text: lines.join("\n"),
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Resend: ${data.message || res.status}`);
  }
}
