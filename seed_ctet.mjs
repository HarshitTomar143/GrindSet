// Seed PostgreSQL from the parsed CTET Excel data in ./seed_data_ctet
// Usage: node seed_ctet.mjs   (after running `python build_ctet_data.py`)
//
// Scoped deliberately to the `ctet_questions` table only. The UPTET `questions`
// table, its seeder and the app that reads it are never touched by this script.

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

// load .env.local first (Next.js convention), then fall back to .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(__dirname, "seed_data_ctet");
const TABLE = "ctet_questions";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and add your PostgreSQL URL."
  );
  process.exit(1);
}

function makeSsl() {
  if (process.env.DATABASE_SSL === "false") return false;
  if (/@(localhost|127\.0\.0\.1)/.test(url)) return false;
  return { rejectUnauthorized: false };
}

// Column order used for both the INSERT and the row tuples below.
const COLS = [
  // provenance
  "source_folder", "source_file", "source_sheet", "source_row", "schema_variant",
  // raw Excel columns, kept verbatim
  "row_id", "s_no", "part", "section_label", "subject_raw", "language_raw",
  "version_note", "topic", "sub_theme", "source_exams", "scan_note",
  "correct_raw", "correct_text",
  // derived
  "exam_id", "paper", "stream", "subject_id", "subject_name", "language_code",
  "exam_year", "exam_session",
  // content
  "question", "option_a", "option_b", "option_c", "option_d", "correct",
  "explanation",
  // content, bilingual halves as the source recorded them
  "question_en", "question_hi", "explanation_en", "explanation_hi",
  "options_en_raw", "options_hi_raw",
  // quality
  "is_gradable", "skip_reason", "is_duplicate_file", "qkey",
];

const DDL = `
  CREATE TABLE ${TABLE} (
    id                SERIAL PRIMARY KEY,

    -- where the row came from
    source_folder     TEXT NOT NULL,
    source_file       TEXT NOT NULL,
    source_sheet      TEXT NOT NULL,
    source_row        INT  NOT NULL,
    schema_variant    TEXT NOT NULL,

    -- raw Excel columns, NULL when that column is absent from the workbook
    row_id            TEXT,
    s_no              TEXT,
    part              TEXT,
    section_label     TEXT,
    subject_raw       TEXT,
    language_raw      TEXT,
    version_note      TEXT,
    topic             TEXT,
    sub_theme         TEXT,
    source_exams      TEXT,
    scan_note         TEXT,
    correct_raw       TEXT,
    correct_text      TEXT,

    -- normalized values derived from the above
    exam_id           TEXT NOT NULL,
    paper             TEXT,
    stream            TEXT,
    subject_id        TEXT,
    subject_name      TEXT,
    language_code     TEXT,
    exam_year         INT,
    exam_session      TEXT,

    -- display content; bilingual halves joined with ' / ' for lib/lang.js
    question          TEXT NOT NULL,
    option_a          TEXT,
    option_b          TEXT,
    option_c          TEXT,
    option_d          TEXT,
    correct           CHAR(1),
    explanation       TEXT,

    -- bilingual halves kept apart where the workbook separated them
    question_en       TEXT,
    question_hi       TEXT,
    explanation_en    TEXT,
    explanation_hi    TEXT,
    options_en_raw    TEXT,
    options_hi_raw    TEXT,

    -- quality flags, so unusable rows stay auditable instead of being dropped
    is_gradable       BOOLEAN NOT NULL,
    skip_reason       TEXT,
    is_duplicate_file BOOLEAN NOT NULL DEFAULT FALSE,
    qkey              TEXT
  )
`;

async function main() {
  const manifest = JSON.parse(
    await readFile(path.join(SEED_DIR, "manifest.json"), "utf-8")
  );

  const client = new pg.Client({ connectionString: url, ssl: makeSsl() });
  await client.connect();
  console.log("Connected to PostgreSQL.");

  // Guard: never proceed if the UPTET table is not where we expect it.
  const { rows: guard } = await client.query(
    "SELECT to_regclass('public.questions') IS NOT NULL AS present"
  );
  if (guard[0].present) {
    const { rows: n } = await client.query("SELECT COUNT(*)::int AS c FROM questions");
    console.log(`UPTET 'questions' table left untouched (${n[0].c} rows).`);
  }

  await client.query(`DROP TABLE IF EXISTS ${TABLE}`);
  await client.query(DDL);
  await client.query(
    `CREATE INDEX idx_ctet_lookup ON ${TABLE} (exam_id, paper, stream, subject_id)`
  );
  await client.query(
    `CREATE INDEX idx_ctet_gradable ON ${TABLE} (is_gradable, is_duplicate_file)`
  );
  await client.query(`CREATE INDEX idx_ctet_qkey ON ${TABLE} (qkey)`);
  console.log(`Created table '${TABLE}'.`);

  let inserted = 0;
  for (const folder of manifest.folders) {
    const rows = JSON.parse(
      await readFile(path.join(SEED_DIR, "rows", folder.file), "utf-8")
    );

    // Batch size is bounded by PostgreSQL's 65535 bind-parameter ceiling.
    const BATCH = Math.floor(60000 / COLS.length);
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const values = [];
      const params = [];
      chunk.forEach((r, ri) => {
        const ph = COLS.map((_, ci) => `$${ri * COLS.length + ci + 1}`);
        values.push(`(${ph.join(",")})`);
        params.push(...COLS.map((c) => (r[c] === undefined ? null : r[c])));
      });
      await client.query(
        `INSERT INTO ${TABLE} (${COLS.join(",")}) VALUES ${values.join(",")}`,
        params
      );
      inserted += chunk.length;
      process.stdout.write(`\rInserted ${inserted}/${manifest.totals.rows} rows…`);
    }
  }

  console.log(`\nDone. Seeded ${inserted} rows into ${TABLE}.`);

  const { rows: summary } = await client.query(
    `SELECT exam_id, paper, stream,
            COUNT(*)::int AS rows,
            COUNT(*) FILTER (WHERE is_gradable)::int AS gradable
       FROM ${TABLE}
      GROUP BY exam_id, paper, stream
      ORDER BY exam_id, paper, stream`
  );
  console.table(summary);

  await client.end();
}

main().catch((e) => {
  console.error("\nSeed failed:", e.message);
  process.exit(1);
});
