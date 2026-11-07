import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { MAX_PDF_BYTES } from "@/lib/pdfs";
import { r2Configured, signedUploadUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * Step one of an upload: the admin's browser asks for a signed URL, then PUTs
 * the file straight to R2 with it. The signature pins the type and the exact
 * size, so the URL cannot be reused for anything else.
 */
export async function POST(request) {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!r2Configured()) {
    return NextResponse.json(
      { error: "File uploads need R2. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET, or paste a link instead." },
      { status: 503 }
    );
  }

  const { fileName, size, contentType } = await request.json().catch(() => ({}));
  const bytes = Number(size);
  if (contentType !== "application/pdf" || !/\.pdf$/i.test(String(fileName || ""))) {
    return NextResponse.json({ error: "Only PDF files can be uploaded." }, { status: 400 });
  }
  if (!Number.isInteger(bytes) || bytes <= 0) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }
  if (bytes > MAX_PDF_BYTES) {
    return NextResponse.json({ error: `PDFs can be at most ${MAX_PDF_BYTES / 1024 / 1024} MB.` }, { status: 400 });
  }

  const slug =
    String(fileName)
      .replace(/\.pdf$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "document";
  const key = `pdfs/${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${slug}.pdf`;

  try {
    const uploadUrl = await signedUploadUrl(key, { contentType, size: bytes });
    return NextResponse.json({ key, uploadUrl });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
