import { findBank } from "@/lib/banks";
import BankMock from "@/components/bank/BankMock";

export const dynamic = "force-dynamic";

export default function MpPoliceMockPage({ params }) {
  return (
    <BankMock
      bank={findBank("mp-police")}
      sectionId={params.section}
      topicId={params.topic}
      mock={params.mock}
    />
  );
}
