import { findBank } from "@/lib/banks";
import BankTopic from "@/components/bank/BankTopic";

export const dynamic = "force-dynamic";

export default function MpPoliceTopicPage({ params }) {
  return (
    <BankTopic
      bank={findBank("mp-police")}
      sectionId={params.section}
      topicId={params.topic}
    />
  );
}
