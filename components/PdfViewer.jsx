"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Draws a PDF onto canvases with pdf.js, so it reads the same on every phone
 * (Android Chrome would otherwise download a PDF instead of showing it) and,
 * for view-only files, without the browser's own save/print toolbar.
 *
 * Pages render only as they scroll near the screen, so a 300-page handbook
 * opens as fast as a 3-page notice. If pdf.js cannot fetch the file (an
 * outside link without CORS, or the R2 bucket's CORS rule is missing) it falls
 * back to the browser's built-in viewer.
 */

const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/";
let pdfjsPromise;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* webpackIgnore: true */ `${PDFJS}legacy/build/pdf.min.mjs`).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS}legacy/build/pdf.worker.min.mjs`;
      return lib;
    });
    pdfjsPromise.catch(() => (pdfjsPromise = null));
  }
  return pdfjsPromise;
}

export default function PdfViewer({ src, viewOnly, text, fallbackHref }) {
  const [doc, setDoc] = useState(null);
  const [ratio, setRatio] = useState(1.414); // A4 until page 1 says otherwise
  const [failed, setFailed] = useState(false);
  const [width, setWidth] = useState(0);
  const wrapRef = useRef(null);

  // Open the document.
  useEffect(() => {
    let cancelled = false;
    let task;
    loadPdfjs()
      .then((pdfjs) => {
        task = pdfjs.getDocument({
          url: src,
          cMapUrl: `${PDFJS}cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `${PDFJS}standard_fonts/`,
        });
        return task.promise;
      })
      .then(async (d) => {
        const first = await d.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        if (cancelled) return;
        setRatio(vp.height / vp.width);
        setDoc(d);
      })
      .catch((e) => {
        console.warn("pdf.js could not open the file, using the browser viewer:", e);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [src]);

  // Track the column width; pages are redrawn when it changes noticeably.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let t;
    const ro = new ResizeObserver(([entry]) => {
      clearTimeout(t);
      t = setTimeout(() => {
        const w = Math.round(entry.contentRect.width);
        setWidth((old) => (Math.abs(old - w) > 24 ? w : old));
      }, 150);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [doc]);

  // Draw pages as they come near the viewport.
  useEffect(() => {
    if (!doc || !width || !wrapRef.current) return;
    const drawn = new Set();
    const tasks = new Map();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const draw = async (holder) => {
      const n = Number(holder.dataset.page);
      if (drawn.has(n)) return;
      drawn.add(n);
      try {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: (width / base.width) * dpr });
        const canvas = holder.querySelector("canvas");
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        holder.style.aspectRatio = `${base.width} / ${base.height}`;
        const task = page.render({ canvasContext: canvas.getContext("2d"), viewport: vp });
        tasks.set(n, task);
        await task.promise;
        holder.classList.add("ready");
      } catch (e) {
        if (e?.name !== "RenderingCancelledException") drawn.delete(n);
      }
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && draw(e.target)),
      { rootMargin: "1200px 0px" }
    );
    wrapRef.current.querySelectorAll(".pdf-page").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      tasks.forEach((t) => t.cancel());
    };
  }, [doc, width]);

  if (failed) {
    return (
      <div className="pdf-viewer">
        <iframe className="pdf-frame" src={src} title="PDF" />
        <p className="muted-sm pdf-fallback-note">
          {text.failed}{" "}
          <a href={fallbackHref} target="_blank" rel="noopener noreferrer">
            {text.openInstead}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div
      className="pdf-viewer"
      ref={wrapRef}
      onContextMenu={viewOnly ? (e) => e.preventDefault() : undefined}
    >
      {!doc && <div className="loading">{text.loading}</div>}
      {doc &&
        Array.from({ length: doc.numPages }, (_, i) => (
          <div
            key={i}
            className="pdf-page"
            data-page={i + 1}
            style={{ aspectRatio: `1 / ${ratio}` }}
          >
            <canvas />
          </div>
        ))}
    </div>
  );
}
