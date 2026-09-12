import { notFound } from "next/navigation";
import {
  findSection,
  getTopics,
  getGroupedTopics,
  displayLabel,
} from "@/lib/banks";
import { uiText } from "@/lib/ui-text";
import { getSiteLang } from "@/lib/site-lang-server";
import { topicCard } from "@/lib/subjects";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";
import TopicGrid from "@/components/bank/TopicGrid";
import UnitNav from "@/components/bank/UnitNav";

// Inside one section: the subjects of a paper, or the topics of a subject that
// is organised by topic. A subject with syllabus units (Hindi, English) shows
// its topics grouped under those units, in syllabus order.

export default async function BankSection({ bank, sectionId }) {
  const section = findSection(bank, sectionId);
  if (!section) notFound();

  const lang = getSiteLang();
  const t = uiText(lang);
  const sectionLabel = displayLabel(section, lang);

  const base = `${bank.base}/${section.id}`;
  const groups = await getGroupedTopics(section);
  const topics = groups ? null : await getTopics(section);
  const isEmpty = groups ? !groups.length : !topics.length;

  // A paper's subjects get their subject icon. A literature topic, whose
  // English name is usually a transliteration, gets its initial instead and
  // keeps its Devanagari name under the English one.
  const isTopic = section.kind === "topic";
  const cards = (list) =>
    list.map((topic) =>
      topicCard(topic, {
        href: `${base}/${topic.id}`,
        lang,
        T: t,
        withIcon: !isTopic,
        hiSubInEn: isTopic,
      })
    );

  const unitTitle = (g) => (lang === "en" ? g.name : g.nameHi || g.name);
  // The unit's other name, or the syllabus section it is printed under.
  const unitCaption = (g) => {
    if (lang === "en") return g.nameHi || g.syllabusPart;
    if (lang === "both") return g.nameHi ? g.name : g.syllabusPart;
    return g.nameHi ? null : g.syllabusPart;
  };

  return (
    <div data-exam={bank.id}>
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
        {groups ? t.subGrouped : isTopic ? t.subTopics : t.subSubjects}
      </p>

      {groups && (
        <UnitNav
          label={t.subGrouped}
          units={groups.map((g) => ({
            id: g.id,
            name: unitTitle(g),
            count: g.topics.length,
          }))}
        />
      )}

      {groups ? (
        groups.map((g, gi) => {
          const caption = unitCaption(g);
          return (
            <section className="topic-group" key={g.id} id={`unit-${g.id}`}>
              <header className="topic-group-head">
                <span className="topic-group-num">{gi + 1}</span>
                <div>
                  <h2 className="topic-group-title">{unitTitle(g)}</h2>
                  {caption && <div className="topic-group-sub">{caption}</div>}
                </div>
                <span className="topic-group-count">
                  {t.topicCount(g.topics.length)}
                </span>
              </header>
              <TopicGrid topics={cards(g.topics)} />
            </section>
          );
        })
      ) : (
        <TopicGrid topics={cards(topics)} />
      )}

      {isEmpty && (
        <p className="page-sub">
          {t.emptyPre} <code>{bank.setupCommand}</code> {t.emptyPost}
        </p>
      )}
    </div>
  );
}
