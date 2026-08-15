import { findBank } from "@/lib/banks";
import BankTopic from "@/components/bank/BankTopic";

export const dynamic = "force-dynamic";

export default function UpTgtPgtTopicPage({ params }) {
  return (
    <BankTopic
      bank={findBank("up-tgt-pgt")}
      sectionId={params.section}
      topicId={params.topic}
    />
  );
}
