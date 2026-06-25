import { query } from "./db";

// Create the table on first use (non-destructive; survives question reseeds).
let ensured;
export function ensureTable() {
  if (!ensured) {
    ensured = query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id            SERIAL PRIMARY KEY,
        name          TEXT NOT NULL,
        email         TEXT,
        section_id    TEXT, section_name   TEXT,
        group_id      TEXT, group_name     TEXT,
        subject_id    TEXT, subject_name   TEXT,
        mock_num      INT,
        total         INT,
        correct       INT,
        wrong         INT,
        skipped       INT,
        percentage    INT,
        duration_seconds INT,
        answers       JSONB,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `).then(() =>
      query(
        "CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions (created_at DESC)"
      )
    );
  }
  return ensured;
}

export async function recordSubmission(d) {
  await ensureTable();
  const { rows } = await query(
    `INSERT INTO submissions
      (name, email, section_id, section_name, group_id, group_name,
       subject_id, subject_name, mock_num, total, correct, wrong, skipped,
       percentage, duration_seconds, answers)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING id`,
    [
      d.name, d.email || null,
      d.sectionId, d.sectionName, d.groupId, d.groupName,
      d.subjectId, d.subjectName, d.mock,
      d.total, d.correct, d.wrong, d.skipped,
      d.percentage, d.duration, JSON.stringify(d.answers || {}),
    ]
  );
  return rows[0].id;
}

export async function getSummary() {
  await ensureTable();
  const totals = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(DISTINCT lower(name))::int AS takers,
            COALESCE(ROUND(AVG(percentage)),0)::int AS avg_pct,
            COUNT(DISTINCT (section_id||group_id||subject_id||mock_num))::int AS tests_attempted
       FROM submissions`
  );
  const perTest = await query(
    `SELECT section_name, subject_name, mock_num,
            COUNT(*)::int AS attempts,
            ROUND(AVG(percentage))::int AS avg_pct,
            MAX(percentage)::int AS best_pct
       FROM submissions
       GROUP BY section_name, subject_name, mock_num
       ORDER BY attempts DESC, avg_pct DESC
       LIMIT 12`
  );
  return { ...totals.rows[0], perTest: perTest.rows };
}

export async function listSubmissions(limit = 500) {
  await ensureTable();
  const { rows } = await query(
    `SELECT id, name, email, section_id, section_name, group_name,
            subject_name, mock_num, total, correct, wrong, skipped,
            percentage, duration_seconds, created_at
       FROM submissions
       ORDER BY created_at DESC
       LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function getSubmission(id) {
  await ensureTable();
  const { rows } = await query("SELECT * FROM submissions WHERE id = $1", [id]);
  return rows[0] || null;
}
