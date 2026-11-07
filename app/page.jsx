import HomeView from "@/components/HomeView";
import { listPublishedPdfs } from "@/lib/pdfs";
import { getAllExamStats } from "@/lib/stats";
import { getSiteLang } from "@/lib/site-lang-server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const lang = getSiteLang();
  // A database hiccup should cost the news & PDFs column, not the whole page.
  const [stats, pdfs] = await Promise.all([
    getAllExamStats(),
    listPublishedPdfs().catch((e) => {
      console.error("Important news & PDFs:", e.message);
      return [];
    }),
  ]);
  return <HomeView lang={lang} stats={stats} pdfs={pdfs} />;
}
