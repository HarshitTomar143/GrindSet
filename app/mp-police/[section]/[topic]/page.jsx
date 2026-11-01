import { findBank } from "@/lib/banks";
import BankTopic from "@/components/bank/BankTopic";
import { bankTopicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }) {
  return bankTopicMetadata("mp-police", params.section, params.topic);
}

export default function MpPoliceTopicPage({ params }) {
  return (
    <BankTopic
      bank={findBank("mp-police")}
      sectionId={params.section}
      topicId={params.topic}
    />
  );
}
