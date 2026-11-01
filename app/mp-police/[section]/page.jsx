import { findBank } from "@/lib/banks";
import BankSection from "@/components/bank/BankSection";
import { bankSectionMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }) {
  return bankSectionMetadata("mp-police", params.section);
}

export default function MpPoliceSectionPage({ params }) {
  return <BankSection bank={findBank("mp-police")} sectionId={params.section} />;
}