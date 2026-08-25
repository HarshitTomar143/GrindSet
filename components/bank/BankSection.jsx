import { notFound } from "next/navigation";
import {
  findSection,
  getTopics,
  getGroupedTopics,
  displayLabel,
} from "@/lib/banks";
import { uiText } from "@/lib/ui-text";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";

// Inside one section: the subjects of a paper, or the topics of a subject that
// is organised by topic. A subject with syllabus units (Hindi, English) shows
// its topics grouped under those units, in syllabus order.

function TopicCard({ href, topic, i, t, lang }) {
  // A Hindi-reading section leads with the Devanagari name and drops the roman
  // one; elsewhere the roman name leads and the Devanagari one sits under it.
  const title = lang === "hi" ? topic.nameHi || topic.name : topic.name;
  const sub = lang === "hi" ? null : topic.nameHi;

  return (
    <a href={href} className="card" style={{ "--i": i }}>
      <div className="card-title">{title}</div>
      {sub && <div className="card-meta">{sub}</div>}
      <div className="card-meta">{t.questionCount(topic.total)}</div>
      <span className="pill">{t.mockCount(topic.mocks)}</span>
    </a>
  );
}

export default async function BankSection({ bank, sectionId }) {
  const section = findSection(bank, sectionId);
  if (!section) notFound();

  const lang = section.uiLang;
  const t = uiText(lang);
  const sectionLabel = displayLabel(section, lang);

  const base = `${bank.base}/${section.id}`;
  const groups = await getGroupedTopics(section);
  const topics = groups ? null : await getTopics(section);
  const isEmpty = groups ? !groups.length : !topics.length;

  return (
    <div>
      <BackLink href={bank.base} label={bank.name} />
      <Breadcrumb
        items={[
          { label: t.home, href: "/" },
          { label: bank.name, href: bank.base },
          { label: sectionLabel },
        ]}
      />
      <h1 className="page-title">{sectionLabel}</h1>
      <p className="page-sub">
        {groups
          ? t.subGrouped
          : section.kind === "topic"
          ? t.subTopics
          : t.subSubjects}
      </p>

      {groups
        ? groups.map((g, gi) => {
            // A Hindi unit needs no caption — the whole page reads in Hindi.
            // Elsewhere the caption is the unit's other name, or the syllabus
            // section it is printed under.
            const caption =
              lang === "hi" ? null : g.nameHi ? g.name : g.syllabusPart;
            return (
              <section className="topic-group" key={g.id}>
                <header className="topic-group-head">
                  <span className="topic-group-num">{gi + 1}</span>
                  <div>
                    <h2 className="topic-group-title">{g.nameHi || g.name}</h2>
                    {caption && (
                      <div className="topic-group-sub">{caption}</div>
                    )}
                  </div>
                  <span className="topic-group-count">
                    {t.topicCount(g.topics.length)}
                  </span>
                </header>
                <div className="grid">
                  {g.topics.map((topic, i) => (
                    <TopicCard
                      key={topic.id}
                      href={`${base}/${topic.id}`}
                      topic={topic}
                      i={i}
                      t={t}
                      lang={lang}
                    />
                  ))}
                </div>
              </section>
            );
          })
        : (
          <div className="grid">
            {topics.map((topic, i) => (
              <TopicCard
                key={topic.id}
                href={`${base}/${topic.id}`}
                topic={topic}
                i={i}
                t={t}
                lang={lang}
              />
            ))}
          </div>
        )}

      {isEmpty && (
        <p className="page-sub">
          {t.emptyPre} <code>{bank.setupCommand}</code> {t.emptyPost}
        </p>
      )}
    </div>
  );
}
