// Shared by the admin tabs. Dates are shown in India time, wherever the admin sits.
const TZ = "Asia/Kolkata";

const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: TZ,
});
const dateOnly = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
const dayShort = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLong = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export const fmtDateTime = (d) => (d ? dateTime.format(new Date(d)) : "—");
export const fmtDate = (d) => (d ? dateOnly.format(new Date(d)) : "—");
// For "YYYY-MM-DD" day keys, which are already India's days.
export const fmtDay = (day, long) => (long ? dayLong : dayShort).format(new Date(`${day}T00:00:00Z`));

export const nf = (n) => Number(n || 0).toLocaleString("en-IN");

export function fmtTime(s) {
  if (s == null) return "—";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function pctClass(p) {
  if (p >= 60) return "correct";
  if (p >= 35) return "skipped";
  return "wrong";
}

export function ago(d) {
  if (!d) return "—";
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  const days = Math.round(mins / (60 * 24));
  return days < 60 ? `${days} d ago` : fmtDate(d);
}

/** Fetches one admin view; throws with the server's message on failure. */
export async function loadView(params) {
  const res = await fetch(`/api/admin/stats?${new URLSearchParams(params)}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Failed to load");
  return data;
}
