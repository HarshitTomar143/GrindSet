import { findBank } from "@/lib/banks";
import BankTopic from "@/components/bank/BankTopic";
import { bankTopicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }) {
  return bankTopicMetadata("ctet", params.section, params.topic);
}

export default function CtetTopicPage({ params }) {
  return (
    <BankTopic
      bank={findBank("ctet")}
      sectionId={params.section}
      topicId={params.topic}
    />
  );
}
