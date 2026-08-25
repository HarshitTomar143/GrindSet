import { getBankOverview } from "@/lib/banks";
import { uiText } from "@/lib/ui-text";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";

// Landing page for a question bank: one card per section, with live counts.
// Shared by every bank that reads from `ctet_questions` (CTET, UP TGT/PGT).

function SetupNotice({ bank, message }) {
  return (
    <div>
      <BackLink href="/" label="Exams" />
      <h1 className="page-title">{bank.name} questions are not loaded</h1>
      <p className="page-sub">{message}</p>
      <div className="q-card">
        <p style={{ marginTop: 0 }}>To load them:</p>
        <ol style={{ lineHeight: 1.8, color: "var(--ink-2)" }}>
          <li>
            Make sure <code>DATABASE_URL</code> is set in{" "}
            <code>.env.local</code>.
          </li>
          <li>
            Run <code>{bank.setupCommand}</code> to parse the workbooks and load
            them into the database.
          </li>
          <li>Refresh this page.</li>
        </ol>
      </div>
    </div>
  );
}

export default async function BankHome({ bank }) {
  let sections;
  try {
    sections = await getBankOverview(bank);
  } catch (e) {
    return <SetupNotice bank={bank} message={e.message} />;
  }

  const live = sections.filter((s) => s.total > 0);

  return (
    <div>
      <BackLink href="/" label="Exams" />
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: bank.name }]}
      />
      <h1 className="page-title">{bank.chooseTitle}</h1>
      <p className="page-sub">{bank.chooseSub}</p>
      <div className="grid two">
        {live.map((sec, i) => {
          // A section that reads in Hindi is introduced in Hindi too, even
          // though the chooser around it stays in English.
          const t = uiText(sec.uiLang);
          const title = sec.uiLang === "hi" ? sec.nameHi || sec.name : sec.name;
          return (
            <a
              key={sec.id}
              href={`${bank.base}/${sec.id}`}
              className="card hero-card"
              style={{ "--i": i }}
            >
              <span className="card-eyebrow">{sec.eyebrow}</span>
              <div className="card-title">{title}</div>
              <p className="card-blurb">{sec.blurb}</p>
              <div className="fact-row">
                {sec.facts.map((f) => (
                  <span className="fact" key={f}>
                    {f}
                  </span>
                ))}
              </div>
              <div className="card-meta">
                {sec.groupCount > 0 && `${t.groupCount(sec.groupCount)} · `}
                {sec.kind === "topic"
                  ? t.topicCount(sec.topicCount)
                  : t.subjectCount(sec.topicCount)}{" "}
                · {t.questionCount(sec.total.toLocaleString("en-IN"))} ·{" "}
                {t.mockCount(sec.mocks)}
              </div>
              <span className="pill">{t.openSection}</span>
            </a>
          );
        })}
      </div>
      {!live.length && (
        <p className="page-sub">
          No {bank.name} questions found yet. Run{" "}
          <code>{bank.setupCommand}</code> to seed them.
        </p>
      )}
    </div>
  );
}
