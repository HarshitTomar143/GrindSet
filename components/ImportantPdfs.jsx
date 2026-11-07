import { canView, canDownload } from "@/lib/pdfs";

function fmtSize(bytes) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

/** The "Important PDFs" strip on the home page. Renders nothing when empty. */
export default function ImportantPdfs({ pdfs, T }) {
  if (!pdfs?.length) return null;
  return (
    <section className="pdf-section" aria-labelledby="important-pdfs">
      <h2 id="important-pdfs" className="strip-title">{T.importantPdfs}</h2>
      <div className="pdf-grid">
        {pdfs.map((p) => {
          const size = fmtSize(p.file_size);
          return (
            <article className="pdf-card" key={p.id}>
              <div className="pdf-card-head">
                <span className="pdf-card-icon"><PdfIcon /></span>
                <div className="pdf-card-text">
                  <h3 className="pdf-card-title">{p.title}</h3>
                  {p.description && <p className="pdf-card-desc">{p.description}</p>}
                </div>
              </div>
              <div className="pdf-card-foot">
                {size && <span className="muted-sm">PDF · {size}</span>}
                <div className="pdf-card-actions">
                  {canView(p.mode) && (
                    <a className={canDownload(p.mode) ? "btn ghost" : "btn"} href={`/pdfs/${p.id}`}>
                      {T.pdfView}
                    </a>
                  )}
                  {canDownload(p.mode) && (
                    <a className="btn" href={`/api/pdfs/${p.id}?download=1`} rel="nofollow">
                      {T.pdfDownload}
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
