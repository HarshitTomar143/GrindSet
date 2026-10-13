import BackLink from "@/components/BackLink";
import HumanCheck from "@/components/HumanCheck";
import { uiText } from "@/lib/ui-text";
import { captchaSiteKey } from "@/lib/human-check";

// Shown in place of a paper to a reader who has opened too many
// (lib/rate-limit.js): a captcha to solve first, or past the hard limit a wait.
export default function PaperLimitNotice({ lang, allowed, backHref = "/" }) {
  if (allowed.challenge) return <HumanCheck siteKey={captchaSiteKey()} lang={lang} />;

  const T = uiText(lang);
  return (
    <div style={{ maxWidth: 520, margin: "40px auto" }}>
      <h1 className="page-title">{T.paperLimitTitle}</h1>
      <p className="page-sub">{T.paperLimitBody(Math.max(1, Math.ceil(allowed.retryAfter / 60)))}</p>
      <BackLink href={backHref} label={T.exams} />
    </div>
  );
}
