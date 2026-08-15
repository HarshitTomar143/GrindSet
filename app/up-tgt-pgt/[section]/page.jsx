import { findBank } from "@/lib/banks";
import BankSection from "@/components/bank/BankSection";

export const dynamic = "force-dynamic";

export default function UpTgtPgtSectionPage({ params }) {
  return (
    <BankSection bank={findBank("up-tgt-pgt")} sectionId={params.section} />
  );
}
