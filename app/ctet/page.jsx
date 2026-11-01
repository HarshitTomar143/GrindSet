import { findBank } from "@/lib/banks";
import BankHome from "@/components/bank/BankHome";
import { examMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = examMetadata("ctet");

export default function CtetHome() {
  return <BankHome bank={findBank("ctet")} />;
}
