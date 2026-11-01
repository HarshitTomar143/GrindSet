import { findBank } from "@/lib/banks";
import BankTopic from "@/components/bank/BankTopic";
import { bankTopicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }) {
  return bankTopicMetadata("up-tgt-pgt", params.section, params.topic);
}

export default function UpTgtPgtTopicPage({ params }) {
  return (
    <BankTopic
      bank={findBank("up-tgt-pgt")}
      sectionId={params.section}
      topicId={params.topic}
    />
  );
}
