import BackLink from "@/components/BackLink";
import { uiText } from "@/lib/ui-text";

// Shown in place of a paper to a reader who has opened too many (lib/rate-limit.js).
export default function PaperLimitNotice({ lang, retryAfter, backHref = "/" }) {
  const T = uiText(lang);
  return (
    <div style={{ maxWidth: 520, margin: "40px auto" }}>
      <h1 className="page-title">{T.paperLimitTitle}</h1>
      <p className="page-sub">{T.paperLimitBody(Math.max(1, Math.ceil(retryAfter / 60)))}</p>
      <BackLink href={backHref} label={T.exams} />
    </div>
  );
}
