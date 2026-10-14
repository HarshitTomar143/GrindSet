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
    `)
      .then(() =>
        query(
          "CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions (created_at DESC)"
        )
      )
      // The account that sat the paper; NULL for a candidate who was not signed in.
      .then(() => query("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_id INT"))
      .then(() =>
        query("CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions (user_id, created_at DESC)")
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
       percentage, duration_seconds, answers, user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING id`,
    [
      d.name, d.email || null,
      d.sectionId, d.sectionName, d.groupId, d.groupName,
      d.subjectId, d.subjectName, d.mock,
      d.total, d.correct, d.wrong, d.skipped,
      d.percentage, d.duration, JSON.stringify(d.answers || {}),
      d.userId || null,
    ]
  );
  return rows[0].id;
}

/** A candidate's own scored papers, newest first, for their account page. */
export async function getUserSubmissions(userId, limit = 30) {
  await ensureTable();
  const { rows } = await query(
    `SELECT id, section_id, section_name, group_id, subject_id, subject_name,
            mock_num, total, correct, percentage, created_at
       FROM submissions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function getSubmission(id) {
  await ensureTable();
  const { rows } = await query("SELECT * FROM submissions WHERE id = $1", [id]);
  return rows[0] || null;
}
