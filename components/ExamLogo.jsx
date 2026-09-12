/**
 * A conducting body's emblem on a light plate.
 *
 * The emblems are line art drawn for paper — CBSE's is teal, UPESSC's and the
 * state seal are black — so they are always shown on a light plate rather than
 * on the page background. That keeps them legible and correctly coloured in
 * dark mode too, the way a favicon stays itself whatever the page around it.
 */
export default function ExamLogo({ exam, size = 56, className = "" }) {
  if (!exam?.logo) return null;
  return (
    <span
      className={`exam-logo ${className}`.trim()}
      style={{ "--logo-size": `${size}px` }}
    >
      <img
        src={exam.logo}
        alt={exam.logoAlt || `${exam.name} logo`}
        width={size}
        height={size}
      />
    </span>
  );
}
