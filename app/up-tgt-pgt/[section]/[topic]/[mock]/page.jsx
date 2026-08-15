import { findBank } from "@/lib/banks";
import BankMock from "@/components/bank/BankMock";

export const dynamic = "force-dynamic";

export default function UpTgtPgtMockPage({ params }) {
  return (
    <BankMock
      bank={findBank("up-tgt-pgt")}
      sectionId={params.section}
      topicId={params.topic}
      mock={params.mock}
    />
  );
}
