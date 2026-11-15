"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

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

const ZOOMS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const ZOOM_KEY = "pdf-zoom";
// Biggest canvas side we draw; phones refuse (blank canvas) much past this.
const MAX_CANVAS = 4096;

export default function PdfViewer({ src, streamSrc, viewOnly, text, fallbackHref }) {
  const [doc, setDoc] = useState(null);
  const [ratio, setRatio] = useState(1.414); // A4 until page 1 says otherwise
  const [failed, setFailed] = useState(false);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const wrapRef = useRef(null);
  const scrollRef = useRef(null);
  const pagesRef = useRef(null);
  const anchorRef = useRef(null);

  // Start zoomed in on narrow screens (a fitted A4 page there is unreadable),
  // or at whatever zoom this reader picked last time.
  useEffect(() => {
    let saved = null;
    try {
      saved = Number(localStorage.getItem(ZOOM_KEY)) || null;
    } catch {}
    if (saved && ZOOMS.includes(saved)) setZoom(saved);
    else if (window.innerWidth < 640) setZoom(1.5);
  }, []);

  const changeZoom = (z) => {
    // Remember where in the document we are, so zooming keeps the same spot.
    const el = pagesRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      anchorRef.current = r.height ? (window.innerHeight / 3 - r.top) / r.height : null;
    }
    setZoom(z);
    try {
      localStorage.setItem(ZOOM_KEY, String(z));
    } catch {}
  };
  const zi = ZOOMS.indexOf(zoom);

  useLayoutEffect(() => {
    const f = anchorRef.current;
    const el = pagesRef.current;
    anchorRef.current = null;
    if (f == null || !el) return;
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top + f * r.height - window.innerHeight / 3 });
  }, [zoom]);

  // Open the document.
  useEffect(() => {
    let cancelled = false;
    let task;
    const common = {
      cMapUrl: `${PDFJS}cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${PDFJS}standard_fonts/`,
    };
    const open = (pdfjs, options) => {
      task?.destroy();
      task = pdfjs.getDocument({ ...common, ...options });
      return task.promise;
    };
    loadPdfjs()
      .then(async (pdfjs) => {
        // Straight from storage first (fastest). If the browser is not allowed
        // to read it there (CORS), go through this site's own server instead,
        // in range requests so a big file still opens a page at a time.
        try {
          return await open(pdfjs, { url: src });
        } catch (e) {
          if (!streamSrc || cancelled) throw e;
          console.warn("pdf.js could not read the file directly, streaming it via the site:", e);
          return open(pdfjs, {
            url: streamSrc,
            disableStream: true,
            disableAutoFetch: true,
            rangeChunkSize: 256 * 1024,
          });
        }
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
  }, [src, streamSrc]);

  // Track the column width; pages are redrawn when it changes noticeably.
  useEffect(() => {
    const el = scrollRef.current;
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
    if (!doc || !width || !pagesRef.current) return;
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
        let scale = ((width * zoom) / base.width) * dpr;
        scale = Math.min(scale, MAX_CANVAS / Math.max(base.width, base.height));
        const vp = page.getViewport({ scale });
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
    pagesRef.current.querySelectorAll(".pdf-page").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      tasks.forEach((t) => t.cancel());
    };
  }, [doc, width, zoom]);

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
      {doc && (
        <div className="pdf-toolbar" role="toolbar" aria-label="Zoom">
          <button
            type="button"
            className="pdf-zoom-btn"
            onClick={() => changeZoom(ZOOMS[zi - 1])}
            disabled={zi <= 0}
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="pdf-zoom-val">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="pdf-zoom-btn"
            onClick={() => changeZoom(ZOOMS[zi + 1])}
            disabled={zi >= ZOOMS.length - 1}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="pdf-zoom-btn pdf-zoom-fit"
            onClick={() => changeZoom(1)}
            disabled={zoom === 1}
          >
            Fit
          </button>
        </div>
      )}
      <div className="pdf-scroll" ref={scrollRef}>
        {doc && (
          <div className="pdf-pages" ref={pagesRef} style={{ width: `${zoom * 100}%` }}>
            {Array.from({ length: doc.numPages }, (_, i) => (
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
        )}
      </div>
    </div>
  );
}
