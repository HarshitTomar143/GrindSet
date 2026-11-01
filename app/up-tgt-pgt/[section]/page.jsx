import { findBank } from "@/lib/banks";
import BankSection from "@/components/bank/BankSection";
import { bankSectionMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }) {
  return bankSectionMetadata("up-tgt-pgt", params.section);
}

export default function UpTgtPgtSectionPage({ params }) {
  return (
    <BankSection bank={findBank("up-tgt-pgt")} sectionId={params.section} />
  );
}
