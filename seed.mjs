// Seed PostgreSQL from the parsed Excel data in ./seed_data
// Usage: node seed.mjs   (after running `python build_data.py`)

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

// load .env.local first (Next.js convention), then fall back to .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(__dirname, "seed_data");

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

const COLS = [
  "section_id", "section_name", "sec_pos",
  "group_id", "group_name", "grp_pos",
  "subject_id", "subject_name", "ord",
  "question", "option_a", "option_b", "option_c", "option_d",
  "correct", "explanation",
];

async function main() {
  const manifest = JSON.parse(
    await readFile(path.join(SEED_DIR, "manifest.json"), "utf-8")
  );

  const client = new pg.Client({ connectionString: url, ssl: makeSsl() });
  await client.connect();
  console.log("Connected to PostgreSQL.");

  await client.query("DROP TABLE IF EXISTS questions");
  await client.query(`
    CREATE TABLE questions (
      id            SERIAL PRIMARY KEY,
      section_id    TEXT NOT NULL,
      section_name  TEXT NOT NULL,
      sec_pos       INT  NOT NULL,
      group_id      TEXT NOT NULL,
      group_name    TEXT NOT NULL,
      grp_pos       INT  NOT NULL,
      subject_id    TEXT NOT NULL,
      subject_name  TEXT NOT NULL,
      ord           INT  NOT NULL,
      question      TEXT NOT NULL,
      option_a      TEXT,
      option_b      TEXT,
      option_c      TEXT,
      option_d      TEXT,
      correct       CHAR(1) NOT NULL,
      explanation   TEXT
    )
  `);
  await client.query(
    "CREATE INDEX idx_questions_lookup ON questions (section_id, group_id, subject_id, ord)"
  );
  console.log("Created table 'questions'.");

  // gather all rows
  const rows = [];
  for (let si = 0; si < manifest.sections.length; si++) {
    const sec = manifest.sections[si];
    for (let gi = 0; gi < sec.groups.length; gi++) {
      const grp = sec.groups[gi];
      for (const subj of grp.subjects) {
        const qs = JSON.parse(
          await readFile(path.join(SEED_DIR, "questions", subj.file), "utf-8")
        );
        qs.forEach((q, ord) => {
          rows.push([
            sec.id, sec.name, si,
            grp.id, grp.name, gi,
            subj.id, subj.name, ord,
            q.question,
            q.options.A || null, q.options.B || null,
            q.options.C || null, q.options.D || null,
            q.correct, q.explanation || null,
          ]);
        });
      }
    }
  }

  // batched multi-row insert
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const values = [];
    const params = [];
    chunk.forEach((row, ri) => {
      const ph = row.map((_, ci) => `$${ri * COLS.length + ci + 1}`);
      values.push(`(${ph.join(",")})`);
      params.push(...row);
    });
    await client.query(
      `INSERT INTO questions (${COLS.join(",")}) VALUES ${values.join(",")}`,
      params
    );
    inserted += chunk.length;
    process.stdout.write(`\rInserted ${inserted}/${rows.length} questions…`);
  }

  console.log(`\nDone. Seeded ${inserted} questions.`);
  await client.end();
}

main().catch((e) => {
  console.error("\nSeed failed:", e.message);
  process.exit(1);
});
