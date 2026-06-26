// Best-effort splitter for the app's bilingual question text.
// Bilingual strings separate English and Hindi with " / " (space-slash-space);
// some questions are single-language. Devanagari detection decides which side
// is Hindi, so either order ("English / हिंदी" or "हिंदी / English") works.
// Plain "/" without surrounding spaces (e.g. the fraction 1/2) is never split.
const DEVANAGARI = /[ऀ-ॿ]/;
const SEP = /\s+\/\s+/;

export function splitLang(text) {
  const raw = text == null ? "" : String(text);
  if (!SEP.test(raw)) {
    const hi = DEVANAGARI.test(raw);
    return { en: hi ? "" : raw, hi: hi ? raw : "", both: raw };
  }
  const en = [];
  const hi = [];
  for (const part of raw.split(SEP)) {
    (DEVANAGARI.test(part) ? hi : en).push(part.trim());
  }
  return { en: en.join(" / ").trim(), hi: hi.join(" / ").trim(), both: raw };
}

// Pick the requested language, gracefully falling back so a single-language
// question is never blanked out.
export function pickLang(text, lang) {
  const s = splitLang(text);
  if (lang === "en") return s.en || s.hi || s.both;
  if (lang === "hi") return s.hi || s.en || s.both;
  return s.both;
}
