import { findBank } from "@/lib/banks";
import BankSection from "@/components/bank/BankSection";

export const dynamic = "force-dynamic";

export default function CtetSectionPage({ params }) {
  return <BankSection bank={findBank("ctet")} sectionId={params.section} />;
}
