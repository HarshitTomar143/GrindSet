"use client";

import { useState } from "react";
import { uiText } from "@/lib/ui-text";

const canView = (mode) => mode === "view" || mode === "both";
const canDownload = (mode) => mode === "download" || mode === "both";

function fmtSize(bytes) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const ICON = {
  pdf: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  news: (
    <>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
};

function Item({ item, T }) {
  const [open, setOpen] = useState(false);
  const kind = item.kind === "news" ? "news" : "pdf";
  const size = kind === "pdf" ? fmtSize(item.file_size) : null;
  const descId = `np-desc-${item.id}`;

  return (
    <li className={open ? "np-item open" : "np-item"} data-kind={kind}>
      <div className="np-head">
        <span className="np-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {ICON[kind]}
          </svg>
        </span>
        <div className="np-title-wrap">
          <h3 className="np-title">
            {item.title}
            {item.is_new && <span className="np-new">{T.pdfNew}</span>}
          </h3>
          {size && <span className="np-meta">PDF · {size}</span>}
        </div>
        {item.description && (
          <button
            type="button"
            className="np-info"
            aria-expanded={open}
            aria-controls={descId}
            aria-label={T.pdfInfo}
            title={T.pdfInfo}
            onClick={() => setOpen((v) => !v)}
          >
            i
          </button>
        )}
      </div>

      {item.description && (
        <div className="np-desc" id={descId}>
          <p>{item.description}</p>
        </div>
      )}

      {(kind === "pdf" || item.link_url) && (
        <div className="np-actions">
          {kind === "pdf" && canView(item.mode) && (
            <a className={canDownload(item.mode) ? "btn ghost" : "btn"} href={`/pdfs/${item.id}`}>
              {T.pdfView}
            </a>
          )}
          {kind === "pdf" && canDownload(item.mode) && (
            <a className="btn" href={`/api/pdfs/${item.id}?download=1`} rel="nofollow">
              {T.pdfDownload}
            </a>
          )}
          {kind === "news" && item.link_url && (
            <a className="btn ghost" href={item.link_url} target="_blank" rel="noopener noreferrer nofollow">
              {T.newsOpen}
            </a>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * "Important news & PDFs": the home page's right-hand column on a laptop, a
 * block under the exams on smaller screens. Details stay hidden until the
 * reader hovers a card or taps its "i". Renders nothing when empty.
 */
export default function ImportantPdfs({ items, lang }) {
  if (!items?.length) return null;
  const T = uiText(lang);
  return (
    <section className="np-panel" aria-labelledby="important-news">
      <h2 id="important-news" className="np-panel-title">{T.importantPdfs}</h2>
      <ul className="np-list">
        {items.map((item) => (
          <Item key={item.id} item={item} T={T} />
        ))}
      </ul>
    </section>
  );
}
