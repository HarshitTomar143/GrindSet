import { findBank } from "@/lib/banks";
import BankHome from "@/components/bank/BankHome";
import { examMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = examMetadata("up-tgt-pgt");

export default function UpTgtPgtHome() {
  return <BankHome bank={findBank("up-tgt-pgt")} />;
}
