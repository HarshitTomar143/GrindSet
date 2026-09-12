/**
 * The mark beside a subject's name. Languages show their own script (अ, Aa,
 * सं); other subjects a small line drawing; anything unmapped — a literature
 * topic, say — the first letter of its own title, passed in from the server.
 *
 * Each subject keeps one colour across every exam (see .subject-icon in
 * globals.css), so "Mathematics" looks the same in UP TET and CTET.
 */

const DRAWINGS = {
  child: (
    <>
      <circle cx="12" cy="5.5" r="2.5" />
      <path d="M12 8v6.5" />
      <path d="M7.5 11.5 12 10l4.5 1.5" />
      <path d="m9.5 20.5 2.5-6 2.5 6" />
    </>
  ),
  math: (
    <>
      <path d="M7 4v6M4 7h6" />
      <path d="M14 7h6" />
      <path d="m4.5 14.5 5 5m0-5-5 5" />
      <path d="M14 17h6" />
      <circle cx="17" cy="14" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  evs: (
    <>
      <path d="M5 20c0-9 5.5-15 15-15 0 9.5-6 15-14 15" />
      <path d="M5 20c2.5-4 6-7.5 10-10" />
    </>
  ),
  science: (
    <>
      <path d="M9.5 3h5" />
      <path d="M10.5 3v6.2L5.2 18.4A1.7 1.7 0 0 0 6.7 21h10.6a1.7 1.7 0 0 0 1.5-2.6L13.5 9.2V3" />
      <path d="M7.6 14.5h8.8" />
    </>
  ),
  social: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </>
  ),
  gs: (
    <>
      <path d="M9.5 18h5M10.5 21h3" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />
    </>
  ),
};

const SCRIPTS = { hindi: "अ", english: "Aa", sanskrit: "सं" };

export default function SubjectIcon({ icon, letter, size = 44 }) {
  const drawing = DRAWINGS[icon];
  return (
    <span
      className="subject-icon"
      data-icon={icon || "letter"}
      style={{ "--si-size": `${size}px` }}
      aria-hidden="true"
    >
      {drawing ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {drawing}
        </svg>
      ) : (
        <span className="subject-glyph">{SCRIPTS[icon] || letter || "•"}</span>
      )}
    </span>
  );
}
