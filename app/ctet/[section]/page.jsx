import { findBank } from "@/lib/banks";
import BankSection from "@/components/bank/BankSection";
import { bankSectionMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }) {
  return bankSectionMetadata("ctet", params.section);
}

export default function CtetSectionPage({ params }) {
  return <BankSection bank={findBank("ctet")} sectionId={params.section} />;
}
