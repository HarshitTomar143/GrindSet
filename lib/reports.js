import { query } from "./db";

// Created on first use; non-destructive so it survives question reseeds.
let ensured;
export function ensureReportsTable() {
  if (!ensured) {
    ensured = query(`
      CREATE TABLE IF NOT EXISTS question_reports (
        id             SERIAL PRIMARY KEY,
        section_id     TEXT, section_name  TEXT,
        subject_id     TEXT, subject_name  TEXT,
        mock_num       INT,
        question_index INT,
        question_text  TEXT,
        reason         TEXT,
        note           TEXT,
        reporter_name  TEXT,
        reporter_email TEXT,
        status         TEXT NOT NULL DEFAULT 'open',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `).then(() =>
      query(
        "CREATE INDEX IF NOT EXISTS idx_reports_created ON question_reports (created_at DESC)"
      )
    );
  }
  return ensured;
}

export async function recordReport(d) {
  await ensureReportsTable();
  const { rows } = await query(
    `INSERT INTO question_reports
       (section_id, section_name, subject_id, subject_name, mock_num,
        question_index, question_text, reason, note, reporter_name, reporter_email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      d.sectionId, d.sectionName, d.subjectId, d.subjectName, d.mock,
      d.questionIndex, d.questionText, d.reason, d.note,
      d.reporterName, d.reporterEmail,
    ]
  );
  return rows[0].id;
}

/** One page of reports, newest first. */
export async function listReports({ page = 1, limit = 50 } = {}) {
  await ensureReportsTable();
  const p = Math.max(1, parseInt(page, 10) || 1);
  const { rows } = await query(
    `SELECT *, COUNT(*) OVER ()::int AS full_count
       FROM question_reports ORDER BY created_at DESC, id DESC
      LIMIT $1 OFFSET $2`,
    [limit, (p - 1) * limit]
  );
  const total = rows[0]?.full_count ?? 0;
  return {
    reports: rows.map(({ full_count, ...r }) => r),
    total,
    page: p,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
