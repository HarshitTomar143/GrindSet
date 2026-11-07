import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getPdf, updatePdf, deletePdf, cleanPdfInput } from "@/lib/pdfs";
import { deleteObject, r2Configured } from "@/lib/r2";

export const dynamic = "force-dynamic";

// Removing the old file is best effort: a leftover object costs a little
// storage, but failing the edit over it would be worse.
async function dropFile(key) {
  if (!key || !r2Configured()) return;
  try {
    await deleteObject(key);
  } catch (e) {
    console.error(`Could not delete R2 object ${key}:`, e.message);
  }
}

export async function PATCH(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;
  const before = await getPdf(params.id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  let data;
  try {
    data = cleanPdfInput(body, { partial: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  try {
    const pdf = await updatePdf(before.id, data);
    if ("file_key" in data && before.file_key && before.file_key !== data.file_key) {
      await dropFile(before.file_key);
    }
    return NextResponse.json({ pdf });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;
  try {
    const gone = await deletePdf(params.id);
    if (!gone) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await dropFile(gone.file_key);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
