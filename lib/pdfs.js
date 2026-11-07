import { query } from "./db";

/**
 * "Important news & PDFs" on the home page, managed from the admin panel.
 *
 * Each row is either a PDF (`kind = 'pdf'`) or a news item (`kind = 'news'`):
 * a heading and details with an optional `link_url`, and no file.
 *
 * A PDF is either a file uploaded to R2 (`file_key`) or a link to a file kept
 * elsewhere (`file_url`). `mode` decides what visitors may do with it:
 *   view     – opens in the on-site viewer, no download button
 *   download – download button only
 *   both     – both buttons
 * "View only" hides the download controls; it cannot stop a determined user
 * from saving what their browser has been sent.
 */

export const PDF_MODES = ["view", "download", "both"];
export const KINDS = ["pdf", "news"];
export const MAX_PDF_BYTES = 100 * 1024 * 1024;
export const canView = (mode) => mode === "view" || mode === "both";
export const canDownload = (mode) => mode === "download" || mode === "both";

let ensured;
export function ensurePdfsTable() {
  if (!ensured) {
    ensured = query(`
      CREATE TABLE IF NOT EXISTS important_pdfs (
        id          SERIAL PRIMARY KEY,
        title       TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        file_key    TEXT,
        file_url    TEXT,
        file_name   TEXT,
        file_size   BIGINT,
        mode        TEXT NOT NULL DEFAULT 'both',
        published   BOOLEAN NOT NULL DEFAULT true,
        sort_order  INT NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
      // Added with news items; harmless on a table that already has them.
      .then(() =>
        query(`ALTER TABLE important_pdfs
                 ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'pdf',
                 ADD COLUMN IF NOT EXISTS link_url TEXT`)
      )
      .catch((e) => {
      ensured = null; // let the next call retry rather than caching the failure
      throw e;
    });
  }
  return ensured;
}

const ORDER = "ORDER BY sort_order ASC, created_at DESC, id DESC";

/** What the home page shows: published items only, without storage details. */
export async function listPublishedPdfs() {
  await ensurePdfsTable();
  const { rows } = await query(
    `SELECT id, kind, title, description, mode, file_size, link_url,
            created_at > now() - interval '7 days' AS is_new
       FROM important_pdfs WHERE published ${ORDER}`
  );
  return rows.map((r) => ({ ...r, file_size: r.file_size == null ? null : Number(r.file_size) }));
}

export async function listAllPdfs() {
  await ensurePdfsTable();
  const { rows } = await query(`SELECT * FROM important_pdfs ${ORDER}`);
  return rows.map((r) => ({ ...r, file_size: r.file_size == null ? null : Number(r.file_size) }));
}

export async function getPdf(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  await ensurePdfsTable();
  const { rows } = await query("SELECT * FROM important_pdfs WHERE id = $1", [n]);
  return rows[0] || null;
}

/**
 * Checks and trims what the admin form sent. `partial` (an edit) lets fields
 * be left out; a new PDF needs a title and a file or link.
 */
export function cleanPdfInput(body, { partial = false } = {}) {
  const out = {};
  const str = (v) => (typeof v === "string" ? v.trim() : "");

  if (!partial || "title" in body) {
    out.title = str(body.title);
    if (!out.title) throw new Error("A heading is required.");
    if (out.title.length > 200) throw new Error("Keep the heading under 200 characters.");
  }
  if (!partial || "description" in body) {
    out.description = str(body.description);
    if (out.description.length > 1000) throw new Error("Keep the description under 1000 characters.");
  }
  if (!partial || "published" in body) out.published = body.published !== false;
  if ("sort_order" in body) out.sort_order = Math.trunc(Number(body.sort_order) || 0);

  if (!partial || "kind" in body) {
    out.kind = KINDS.includes(body.kind) ? body.kind : "pdf";
  }

  // News: no file and no view/download choice, an optional link instead.
  if (out.kind === "news") {
    const link = str(body.link_url);
    if (link) {
      let parsed;
      try {
        parsed = new URL(link);
      } catch {}
      if (!parsed || !/^https?:$/.test(parsed.protocol)) throw new Error("The link must start with http:// or https://.");
      out.link_url = parsed.toString();
    } else {
      out.link_url = null;
    }
    Object.assign(out, { mode: "view", file_key: null, file_url: null, file_name: null, file_size: null });
    return out;
  }
  if (out.kind === "pdf") out.link_url = null;

  if (!partial || "mode" in body) {
    out.mode = PDF_MODES.includes(body.mode) ? body.mode : null;
    if (!out.mode) throw new Error("Choose whether the PDF is viewable, downloadable or both.");
  }

  // The file: an uploaded R2 key, or an outside link — exactly one.
  if (!partial || "file_key" in body || "file_url" in body) {
    const key = str(body.file_key);
    const url = str(body.file_url);
    if (key) {
      if (!/^pdfs\/[\w.-]+\.pdf$/.test(key)) throw new Error("That upload key is not valid.");
      out.file_key = key;
      out.file_url = null;
      out.file_name = str(body.file_name).slice(0, 200) || "document.pdf";
      const size = Number(body.file_size);
      out.file_size = Number.isFinite(size) && size > 0 ? Math.trunc(size) : null;
    } else if (url) {
      let parsed;
      try {
        parsed = new URL(url);
      } catch {}
      if (!parsed || !/^https?:$/.test(parsed.protocol)) throw new Error("The link must start with http:// or https://.");
      out.file_url = parsed.toString();
      out.file_key = null;
      out.file_name = null;
      out.file_size = null;
    } else {
      throw new Error("Upload a PDF or paste a link to one.");
    }
  }
  return out;
}

export async function createPdf(data) {
  await ensurePdfsTable();
  // New items go to the top of the list.
  const { rows } = await query(
    `INSERT INTO important_pdfs
       (title, description, file_key, file_url, file_name, file_size, mode, published, kind, link_url, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
       COALESCE((SELECT MIN(sort_order) - 1 FROM important_pdfs), 0))
     RETURNING *`,
    [
      data.title, data.description, data.file_key, data.file_url, data.file_name, data.file_size,
      data.mode, data.published, data.kind || "pdf", data.link_url || null,
    ]
  );
  return rows[0];
}

const EDITABLE = [
  "title", "description", "file_key", "file_url", "file_name", "file_size",
  "mode", "published", "sort_order", "kind", "link_url",
];

export async function updatePdf(id, data) {
  await ensurePdfsTable();
  const cols = EDITABLE.filter((c) => c in data);
  if (cols.length === 0) return getPdf(id);
  const sets = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
  const { rows } = await query(
    `UPDATE important_pdfs SET ${sets}, updated_at = now() WHERE id = $1 RETURNING *`,
    [Number(id), ...cols.map((c) => data[c])]
  );
  return rows[0] || null;
}

export async function deletePdf(id) {
  await ensurePdfsTable();
  const { rows } = await query("DELETE FROM important_pdfs WHERE id = $1 RETURNING *", [Number(id)]);
  return rows[0] || null;
}

/** Saves the admin's drag order: `ids` top to bottom. */
export async function reorderPdfs(ids) {
  await ensurePdfsTable();
  const clean = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (clean.length === 0) return;
  await query(
    `UPDATE important_pdfs p SET sort_order = o.ord
       FROM unnest($1::int[]) WITH ORDINALITY AS o(id, ord)
      WHERE p.id = o.id`,
    [clean]
  );
}
