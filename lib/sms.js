/**
 * Sends the one-time sign-in code by SMS.
 *
 * Two Indian gateways are supported; whichever has its keys set is used:
 *
 *   MSG91      MSG91_AUTH_KEY + MSG91_TEMPLATE_ID (a DLT-approved OTP template)
 *   Fast2SMS   FAST2SMS_API_KEY (its "otp" route)
 *
 * With neither set, a development server prints the code to its own console
 * so the flow can be tried without sending anything; in production the mobile
 * option is simply not offered.
 */

export function smsProvider() {
  if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) return "msg91";
  if (process.env.FAST2SMS_API_KEY) return "fast2sms";
  return null;
}

export function phoneSignInEnabled() {
  return Boolean(smsProvider()) || process.env.NODE_ENV !== "production";
}

async function viaMsg91(mobile, code) {
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", process.env.MSG91_TEMPLATE_ID);
  url.searchParams.set("mobile", `91${mobile}`);
  url.searchParams.set("otp", code);
  const res = await fetch(url, {
    method: "POST",
    headers: { authkey: process.env.MSG91_AUTH_KEY, "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.type !== "success") throw new Error(`MSG91: ${data.message || res.status}`);
}

async function viaFast2Sms(mobile, code) {
  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: { authorization: process.env.FAST2SMS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ route: "otp", variables_values: code, numbers: mobile }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.return !== true) throw new Error(`Fast2SMS: ${data.message || res.status}`);
}

/** @param mobile ten digits, no country code. Throws if the gateway refuses. */
export async function sendOtpSms(mobile, code) {
  const provider = smsProvider();
  if (provider === "msg91") return viaMsg91(mobile, code);
  if (provider === "fast2sms") return viaFast2Sms(mobile, code);
  if (process.env.NODE_ENV === "production") throw new Error("No SMS gateway configured");
  console.log(`[otp] ${mobile} -> ${code} (no SMS gateway configured; development only)`);
  return undefined;
}
