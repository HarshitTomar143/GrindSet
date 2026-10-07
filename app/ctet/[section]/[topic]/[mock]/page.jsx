import { findBank } from "@/lib/banks";
import BankMock from "@/components/bank/BankMock";

export const dynamic = "force-dynamic";
// A paper in progress is not a page to land on from search.
export const metadata = { robots: { index: false, follow: true } };

export default function CtetMockPage({ params }) {
  return (
    <BankMock
      bank={findBank("ctet")}
      sectionId={params.section}
      topicId={params.topic}
      mock={params.mock}
    />
  );
}
