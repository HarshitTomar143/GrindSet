import { NextResponse } from "next/server";
import { getManifest } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const manifest = await getManifest();
    return NextResponse.json(manifest);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
