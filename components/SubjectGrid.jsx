import TopicGrid from "@/components/bank/TopicGrid";
import { topicCard } from "@/lib/subjects";
import { uiText } from "@/lib/ui-text";

/**
 * The subjects inside a UP TET paper. Built from the same card as the topic
 * grids the other banks use — subject icon, name, counts, coverage — so the
 * drill-down looks the same whichever exam you came in through.
 */
export default function SubjectGrid({ sectionId, groupId, subjects, lang }) {
  const T = uiText(lang);
  return (
    <TopicGrid
      topics={subjects.map((s) =>
        topicCard(s, { href: `/${sectionId}/${groupId}/${s.id}`, lang, T })
      )}
    />
  );
}
