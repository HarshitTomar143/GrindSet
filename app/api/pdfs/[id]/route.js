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

  const wantsDownload = new URL(request.url).searchParams.has("download");
  if (wantsDownload ? !canDownload(pdf.mode) : !canView(pdf.mode)) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

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
