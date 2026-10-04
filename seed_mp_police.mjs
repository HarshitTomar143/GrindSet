// Seed PostgreSQL from the parsed MP Police data in ./seed_data_mp_police
// Usage: node seed_mp_police.mjs [--skip-url-check]
//        (after `python build_mp_police_data.py` and `node upload_mp_police_diagrams.mjs`)
//
// Scoped deliberately to the `mp_police_questions` table only. The UPTET
// `questions` table and the `ctet_questions` table are never touched.

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

// load .env.local first (Next.js convention), then fall back to .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(__dirname, "seed_data_mp_police");
const TABLE = "mp_police_questions";
const SKIP_URL_CHECK = process.argv.includes("--skip-url-check");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and add your PostgreSQL URL."
  );
  process.exit(1);
}
const publicBase = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

function makeSsl() {
  if (process.env.DATABASE_SSL === "false") return false;
  if (/@(localhost|127\.0\.0\.1)/.test(url)) return false;
  return { rejectUnauthorized: false };
}

// Column order used for both the INSERT and the row tuples below.
const COLS = [
  // provenance
  "source_file", "source_row",
  // which paper
  "exam_id", "sitting_id", "exam_year", "exam_date", "shift", "q_no",
  "section", "section_hi",
  // content
  "question_en", "question_hi",
  "option_a_en", "option_b_en", "option_c_en", "option_d_en",
  "option_a_hi", "option_b_hi", "option_c_hi", "option_d_hi",
  "correct", "answer_raw", "official_key", "is_disputed",
  "explanation_en", "explanation_hi", "note",
  // figure
  "has_figure", "figure_ref", "options_are_figures", "diagram_status",
  "diagram_key", "diagram_url", "diagram_width", "diagram_height",
  // quality
  "is_gradable", "skip_reason",
];

const DDL = `
  CREATE TABLE ${TABLE} (
    id                  SERIAL PRIMARY KEY,

    -- where the row came from
    source_file         TEXT NOT NULL,
    source_row          INT  NOT NULL,

    -- which paper: one sitting = one 100-question paper
    exam_id             TEXT NOT NULL,
    sitting_id          TEXT NOT NULL,
    exam_year           INT  NOT NULL,
    exam_date           DATE,
    shift               INT,
    q_no                INT  NOT NULL,
    section             TEXT,
    section_hi          TEXT,

    -- content; the Hindi half is NULL where the workbook is English-only
    question_en         TEXT,
    question_hi         TEXT,
    option_a_en         TEXT,
    option_b_en         TEXT,
    option_c_en         TEXT,
    option_d_en         TEXT,
    option_a_hi         TEXT,
    option_b_hi         TEXT,
    option_c_hi         TEXT,
    option_d_hi         TEXT,
    correct             CHAR(1),
    answer_raw          TEXT,
    official_key        TEXT,
    is_disputed         BOOLEAN NOT NULL DEFAULT FALSE,
    explanation_en      TEXT,
    explanation_hi      TEXT,
    note                TEXT,

    -- figure. diagram_status: 'none' (no figure needed), 'ok', or 'missing'
    -- (the paper refers to a figure that was never supplied).
    has_figure          BOOLEAN NOT NULL DEFAULT FALSE,
    figure_ref          TEXT,
    options_are_figures BOOLEAN NOT NULL DEFAULT FALSE,
    diagram_status      TEXT NOT NULL,
    diagram_key         TEXT,
    diagram_url         TEXT,
    diagram_width       INT,
    diagram_height      INT,

    -- quality flags, so unusable rows stay auditable instead of being dropped
    is_gradable         BOOLEAN NOT NULL,
    skip_reason         TEXT,

    UNIQUE (sitting_id, q_no),
    -- a figure question may only be served together with its picture
    CHECK (NOT (is_gradable AND has_figure AND diagram_url IS NULL)),
    CHECK ((diagram_key IS NULL) = (diagram_url IS NULL))
  )
`;

async function checkUrls(rows) {
  const withDiagram = rows.filter((r) => r.diagram_url);
  let bad = 0;
  for (let i = 0; i < withDiagram.length; i += 12) {
    await Promise.all(
      withDiagram.slice(i, i + 12).map(async (r) => {
        const res = await fetch(r.diagram_url, { method: "HEAD" }).catch((e) => ({ ok: false, status: e.message }));
        if (!res.ok || !String(res.headers?.get("content-type") || "").startsWith("image/")) {
          bad++;
          console.error(`  not reachable: ${r.sitting_id} Q${r.q_no} ${r.diagram_url} (${res.status})`);
        }
      })
    );
  }
  if (bad) {
    throw new Error(`${bad} diagram URL(s) do not resolve. Run upload_mp_police_diagrams.mjs first; nothing was written.`);
  }
  console.log(`All ${withDiagram.length} diagram URLs resolve.`);
}

async function main() {
  const manifest = JSON.parse(await readFile(path.join(SEED_DIR, "manifest.json"), "utf-8"));
  const rows = JSON.parse(await readFile(path.join(SEED_DIR, "rows.json"), "utf-8"));

  if (rows.some((r) => r.diagram_key) && !publicBase) {
    throw new Error("R2_PUBLIC_URL is not set - it is needed to build the diagram URLs. See .env.example.");
  }
  for (const r of rows) {
    r.diagram_url = r.diagram_key ? `${publicBase}/${r.diagram_key}` : null;
  }

  // Refuse to store links to pictures that are not actually there.
  if (!SKIP_URL_CHECK) await checkUrls(rows);

  const client = new pg.Client({ connectionString: url, ssl: makeSsl() });
  await client.connect();
  console.log("Connected to PostgreSQL.");

  // Guard: report the other banks so it is visible they were left alone.
  for (const other of ["questions", "ctet_questions"]) {
    const { rows: guard } = await client.query("SELECT to_regclass($1) IS NOT NULL AS present", [`public.${other}`]);
    if (guard[0].present) {
      const { rows: n } = await client.query(`SELECT COUNT(*)::int AS c FROM ${other}`);
      console.log(`'${other}' table left untouched (${n[0].c} rows).`);
    }
  }

  // One transaction: a failed load leaves the previous table in place.
  await client.query("BEGIN");
  try {
    await client.query(`DROP TABLE IF EXISTS ${TABLE}`);
    await client.query(DDL);
    await client.query(`CREATE INDEX idx_mp_police_sitting ON ${TABLE} (sitting_id, q_no)`);
    await client.query(`CREATE INDEX idx_mp_police_section ON ${TABLE} (section)`);
    await client.query(`CREATE INDEX idx_mp_police_gradable ON ${TABLE} (is_gradable)`);

    // Batch size is bounded by PostgreSQL's 65535 bind-parameter ceiling.
    const BATCH = Math.floor(60000 / COLS.length);
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const values = [];
      const params = [];
      chunk.forEach((r, ri) => {
        const ph = COLS.map((_, ci) => `$${ri * COLS.length + ci + 1}`);
        values.push(`(${ph.join(",")})`);
        params.push(...COLS.map((c) => (r[c] === undefined ? null : r[c])));
      });
      await client.query(`INSERT INTO ${TABLE} (${COLS.join(",")}) VALUES ${values.join(",")}`, params);
      inserted += chunk.length;
      process.stdout.write(`\rInserted ${inserted}/${manifest.totals.rows} rows…`);
    }

    const { rows: check } = await client.query(
      `SELECT COUNT(*)::int AS rows, COUNT(diagram_url)::int AS diagrams FROM ${TABLE}`
    );
    if (check[0].rows !== manifest.totals.rows || check[0].diagrams !== manifest.totals.diagrams) {
      throw new Error(`table holds ${check[0].rows} rows / ${check[0].diagrams} diagrams, manifest says ${manifest.totals.rows} / ${manifest.totals.diagrams}`);
    }
    await client.query("COMMIT");
    console.log(`\nDone. Seeded ${inserted} rows into ${TABLE}.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }

  const { rows: summary } = await client.query(
    `SELECT exam_year,
            COUNT(DISTINCT sitting_id)::int AS papers,
            COUNT(*)::int AS rows,
            COUNT(*) FILTER (WHERE is_gradable)::int AS gradable,
            COUNT(diagram_url)::int AS diagrams,
            COUNT(*) FILTER (WHERE diagram_status = 'missing')::int AS diagram_missing
       FROM ${TABLE}
      GROUP BY exam_year
      ORDER BY exam_year`
  );
  console.table(summary);

  await client.end();
}

main().catch((e) => {
  console.error("\nSeed failed:", e.message);
  process.exit(1);
});
