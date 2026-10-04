import { findBank } from "@/lib/banks";
import BankHome from "@/components/bank/BankHome";

export const dynamic = "force-dynamic";

export default function MpPoliceHome() {
  return <BankHome bank={findBank("mp-police")} />;
}
