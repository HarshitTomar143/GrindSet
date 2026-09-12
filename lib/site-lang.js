/**
 * The language the site's own copy reads in — headings, buttons, card text.
 * Question text is separate: it is bilingual in the data and switched on the
 * quiz screen with lib/lang.js.
 *
 * Hindi is the default. The choice lives in a cookie rather than localStorage
 * because pages are rendered on the server, and the server has to know the
 * language before it writes the HTML.
 */

export const SITE_LANGS = ["hi", "en", "both"];
export const DEFAULT_SITE_LANG = "hi";
export const LANG_COOKIE = "siteLang";

export function normalizeLang(value) {
  return SITE_LANGS.includes(value) ? value : DEFAULT_SITE_LANG;
}

/** The value for <html lang>. */
export function htmlLang(lang) {
  return lang === "en" ? "en" : "hi";
}

// Anything that is not a letter: digits, spaces, arrows, ticks, brackets.
// Devanagari vowel signs are \p{M}, so they count as part of a word here.
const LEAD = /^[^\p{L}\p{M}]*/u;
const TRAIL = /[^\p{L}\p{M}]*$/u;

// Past this combined length the two versions go on separate lines; pages set
// `white-space: pre-line` on the paragraphs where that happens.
const LONG = 70;

/**
 * "Both" copy: Hindi first, then English.
 *
 * Short copy is joined on one line, and whatever the two share at either end —
 * a count, an arrow, a tick — is printed once: "30 प्रश्न" + "30 questions"
 * reads "30 प्रश्न / questions", and "टेस्ट शुरू करें →" + "Start test →" reads
 * "टेस्ट शुरू करें / Start test →". Long copy goes on two lines instead, unless
 * `inline` is set for a place that cannot wrap (a name, a tag).
 */
export function joinBi(hi, en, inline = false) {
  if (!hi) return en || "";
  if (!en || hi === en) return hi;
  if (!inline && hi.length + en.length > LONG) return `${hi}\n${en}`;

  // A shared leading count ("30 ") is printed once, but only when nothing after
  // it is numeric too — otherwise "2 घंटे 30 मिनट" + "2 hours 30 minutes" would
  // lose the English "2".
  const lead = hi.match(LEAD)[0];
  const pre =
    lead &&
    lead === en.match(LEAD)[0] &&
    !DIGIT.test(hi.slice(lead.length) + en.slice(lead.length))
      ? lead
      : "";
  const h = hi.slice(pre.length);
  const e = en.slice(pre.length);

  // A shared ending — an arrow, "!", ")" — is printed once. Numbers never are,
  // so "पेपर 1" + "Paper 1" stays "पेपर 1 / Paper 1", not "पेपर / Paper 1".
  const suf = commonSuffix(h.match(TRAIL)[0], e.match(TRAIL)[0]).replace(/^.*\d/, "");
  return `${pre}${h.slice(0, h.length - suf.length)} / ${e.slice(0, e.length - suf.length)}${suf}`;
}

const DIGIT = /\d/;

function commonSuffix(a, b) {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return a.slice(a.length - n);
}

/** Copy for the reader's language, from an English and a Hindi version. */
export function bi(lang, en, hi, inline = false) {
  if (lang === "en") return en || hi || "";
  if (lang === "hi") return hi || en || "";
  return joinBi(hi, en, inline);
}

/**
 * Resolve a value that may be bilingual. `{ en, hi }` becomes one string, or
 * one list resolved item by item; anything else comes back unchanged.
 */
export function loc(value, lang) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("en" in value || "hi" in value)
  ) {
    return value;
  }
  const { en, hi } = value;
  if (Array.isArray(en) || Array.isArray(hi)) {
    const a = en || [];
    const b = hi || [];
    if (lang === "en") return a.length ? a : b;
    if (lang === "hi") return b.length ? b : a;
    return Array.from({ length: Math.max(a.length, b.length) }, (_, i) =>
      joinBi(b[i], a[i], true)
    );
  }
  return bi(lang, en, hi);
}
