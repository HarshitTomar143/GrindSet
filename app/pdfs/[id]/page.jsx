import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import PdfViewer from "@/components/PdfViewer";
import { getPdf, canView, canDownload } from "@/lib/pdfs";
import { signedReadUrl } from "@/lib/r2";
import { uiText } from "@/lib/ui-text";
import { getSiteLang } from "@/lib/site-lang-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const pdf = await getPdf(params.id).catch(() => null);
  if (!pdf || !pdf.published) return {};
  return { title: pdf.title, description: pdf.description || undefined };
}

export default async function PdfPage({ params }) {
  const pdf = await getPdf(params.id).catch(() => null);
  if (!pdf || !pdf.published || pdf.kind === "news" || !canView(pdf.mode)) notFound();

  const lang = getSiteLang();
  const T = uiText(lang);

  // Signed fresh for each visit, so the page never carries a permanent link.
  const src = pdf.file_key
    ? await signedReadUrl(pdf.file_key, { fileName: pdf.file_name || `${pdf.title}.pdf`, expiresIn: 60 * 60 })
    : pdf.file_url;

  return (
    <div>
      <BackLink href="/" label={T.pdfBack} />
      <div className="pdf-page-head">
        <div>
          <h1 className="page-title">{pdf.title}</h1>
          {pdf.description && <p className="page-sub pdf-page-sub">{pdf.description}</p>}
        </div>
        {canDownload(pdf.mode) && (
          <a className="btn" href={`/api/pdfs/${pdf.id}?download=1`}>
            {T.pdfDownload}
          </a>
        )}
      </div>
      <PdfViewer
        src={src}
        viewOnly={!canDownload(pdf.mode)}
        text={{ loading: T.pdfLoading, failed: T.pdfFailed, openInstead: T.pdfOpenInstead }}
        fallbackHref={`/api/pdfs/${pdf.id}`}
      />
    </div>
  );
}
