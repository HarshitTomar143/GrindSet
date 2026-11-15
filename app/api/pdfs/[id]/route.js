import { NextResponse } from "next/server";
import { getPdf, canDownload, canView } from "@/lib/pdfs";
import { signedReadUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * /api/pdfs/12?download=1 sends the browser to the file. A signed URL is made
 * fresh on every click, so the links on the page never go stale and the bucket
 * does not have to be public. `download` is honoured only when the admin
 * allowed it; otherwise the file is sent for viewing only.
 */
export async function GET(request, { params }) {
  const pdf = await getPdf(params.id).catch(() => null);
  if (!pdf || !pdf.published || pdf.kind === "news" || !(pdf.file_key || pdf.file_url)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const search = new URL(request.url).searchParams;
  const wantsDownload = search.has("download");
  if (wantsDownload ? !canDownload(pdf.mode) : !canView(pdf.mode)) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  // ?stream=1 serves the bytes from this origin, for the on-site viewer when
  // the browser may not read the bucket directly (an origin missing from the
  // R2 CORS rule, or an outside link without CORS). Range requests are passed
  // through, so pdf.js still fetches big files a piece at a time.
  if (search.has("stream")) return streamPdf(request, pdf);

  if (pdf.file_url) return NextResponse.redirect(pdf.file_url, 302);

  try {
    const url = await signedReadUrl(pdf.file_key, {
      download: wantsDownload,
      fileName: pdf.file_name || `${pdf.title}.pdf`,
      expiresIn: 5 * 60,
    });
    const res = NextResponse.redirect(url, 302);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const PASS_HEADERS = ["content-length", "content-range", "accept-ranges", "etag", "last-modified"];

async function streamPdf(request, pdf) {
  try {
    const url = pdf.file_url
      ? pdf.file_url
      : await signedReadUrl(pdf.file_key, {
          fileName: pdf.file_name || `${pdf.title}.pdf`,
          expiresIn: 5 * 60,
        });
    const range = request.headers.get("range");
    const upstream = await fetch(url, { headers: range ? { Range: range } : {} });
    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 });
    }
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=300",
    });
    for (const h of PASS_HEADERS) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
