import { findBank } from "@/lib/banks";
import BankHome from "@/components/bank/BankHome";

export const dynamic = "force-dynamic";

export default function UpTgtPgtHome() {
  return <BankHome bank={findBank("up-tgt-pgt")} />;
}
