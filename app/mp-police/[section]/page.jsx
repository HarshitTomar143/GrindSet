import { findBank } from "@/lib/banks";
import BankSection from "@/components/bank/BankSection";

export const dynamic = "force-dynamic";

export default function MpPoliceSectionPage({ params }) {
  return <BankSection bank={findBank("mp-police")} sectionId={params.section} />;
}
