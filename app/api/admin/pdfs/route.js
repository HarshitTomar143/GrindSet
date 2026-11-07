import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { listAllPdfs, createPdf, cleanPdfInput, reorderPdfs } from "@/lib/pdfs";
import { r2Configured } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = requireAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json({ pdfs: await listAllPdfs(), uploads: r2Configured() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const denied = requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  let data;
  try {
    data = cleanPdfInput(body);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  try {
    return NextResponse.json({ pdf: await createPdf(data) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** Reorder: { order: [id, id, …] } top to bottom. */
export async function PUT(request) {
  const denied = requireAdmin();
  if (denied) return denied;
  const { order } = await request.json().catch(() => ({}));
  if (!Array.isArray(order)) return NextResponse.json({ error: "order must be a list of ids" }, { status: 400 });
  try {
    await reorderPdfs(order);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
