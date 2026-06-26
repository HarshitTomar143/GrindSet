import { query, MOCK_SIZE } from "./db";

/**
 * Build the navigation tree (sections -> groups -> subjects with counts)
 * by grouping the questions table. Shape matches what the pages expect.
 */
export async function getManifest() {
  const { rows } = await query(
    `SELECT sec_pos, section_id, section_name,
            grp_pos, group_id, group_name,
            subject_id, subject_name, COUNT(*)::int AS total
       FROM questions
       GROUP BY sec_pos, section_id, section_name,
                grp_pos, group_id, group_name,
                subject_id, subject_name
       ORDER BY sec_pos, grp_pos, subject_name`
  );

  const sections = [];
  const secMap = new Map();
  const grpMap = new Map();

  for (const r of rows) {
    let sec = secMap.get(r.section_id);
    if (!sec) {
      sec = { id: r.section_id, name: r.section_name, groups: [] };
      secMap.set(r.section_id, sec);
      sections.push(sec);
    }
    const gKey = r.section_id + "/" + r.group_id;
    let grp = grpMap.get(gKey);
    if (!grp) {
      grp = { id: r.group_id, name: r.group_name, subjects: [] };
      grpMap.set(gKey, grp);
      sec.groups.push(grp);
    }
    grp.subjects.push({
      id: r.subject_id,
      name: r.subject_name,
      total: r.total,
      mocks: Math.max(1, Math.ceil(r.total / MOCK_SIZE)),
    });
  }

  return { mockSize: MOCK_SIZE, sections };
}

/**
 * The 30 questions that make up one mock paper (1-based mock number).
 */
export async function getMockQuestions(sectionId, groupId, subjectId, mockNum) {
  const offset = (mockNum - 1) * MOCK_SIZE;
  const { rows } = await query(
    `SELECT question, option_a, option_b, option_c, option_d, correct, explanation
       FROM questions
      WHERE section_id = $1 AND group_id = $2 AND subject_id = $3
      ORDER BY ord
      LIMIT $4 OFFSET $5`,
    [sectionId, groupId, subjectId, MOCK_SIZE, offset]
  );
  return rows.map((r) => ({
    question: r.question,
    options: { A: r.option_a, B: r.option_b, C: r.option_c, D: r.option_d },
    correct: r.correct,
    explanation: r.explanation,
  }));
}

export async function getAllMockPapersForSubject(sectionId, groupId, subjectId, mockCount) {
  const { rows } = await query(
    `SELECT question, option_a, option_b, option_c, option_d, correct, explanation
       FROM questions
      WHERE section_id = $1 AND group_id = $2 AND subject_id = $3
      ORDER BY ord`,
    [sectionId, groupId, subjectId]
  );

  const results = [];
  for (let i = 0; i < mockCount; i += 1) {
    const slice = rows.slice(i * MOCK_SIZE, (i + 1) * MOCK_SIZE);
    if (!slice.length) continue;
    results.push({
      mock: i + 1,
      questions: slice.map((r) => ({
        question: r.question,
        options: { A: r.option_a, B: r.option_b, C: r.option_c, D: r.option_d },
        correct: r.correct,
        explanation: r.explanation,
      })),
    });
  }
  return results;
}

export function findSection(manifest, sectionId) {
  return manifest.sections.find((s) => s.id === sectionId) || null;
}

export function findGroup(section, groupId) {
  return section?.groups.find((g) => g.id === groupId) || null;
}

export function findSubject(group, subjectId) {
  return group?.subjects.find((s) => s.id === subjectId) || null;
}
