import { query } from "./db";
import { BANKS } from "./banks";
import { ensureTable } from "./submissions";
import { ensureUsersTable } from "./users";

/**
 * Numbers for the /admin panel: how much the site is used, which papers are
 * sat, and who sits them.
 *
 * Everything is read from finished papers (the `submissions` table) and from
 * accounts (`users`). A paper that was opened and never submitted leaves no
 * row, so nothing here counts it.
 *
 * Most candidates are not signed in, so a "person" is whatever identifies a
 * result best: its account, else the email typed at the name gate, else the
 * name. Two people who type the same name and no email count as one.
 */

// Days are India's days, whatever zone the database runs in.
const TZ = "Asia/Kolkata";
const DAY = `(created_at AT TIME ZONE '${TZ}')::date`;
const TODAY = `(now() AT TIME ZONE '${TZ}')::date`;

const PERSON = `COALESCE('u:' || user_id, 'e:' || lower(NULLIF(trim(email), '')), 'n:' || lower(trim(name)))`;

// A result's group_id is its bank's prefix; UP TET results have none of them.
const PREFIXES = BANKS.map((b) => b.resultPrefix);
export const EXAMS = [{ id: "uptet", name: "UP TET" }, ...BANKS.map((b) => ({ id: b.id, name: b.name }))];

function examOfGroup(groupId) {
  const bank = BANKS.find((b) => b.resultPrefix === groupId);
  return bank ? { id: bank.id, name: bank.name } : EXAMS[0];
}

/** Adds the WHERE clause for one exam's results; returns the next $n to use. */
function examFilter(examId, where, params) {
  const bank = BANKS.find((b) => b.id === examId);
  if (bank) {
    params.push(bank.resultPrefix);
    where.push(`group_id = $${params.length}`);
  } else if (examId === "uptet") {
    params.push(PREFIXES);
    where.push(`(group_id IS NULL OR group_id <> ALL($${params.length}))`);
  }
}

export const RANGE_DAYS = [7, 30, 90];

/**
 * The overview tab: headline counts, activity per day over the last `days`
 * days, and the split by exam and by sign-in method.
 */
export async function getOverview(days = 30) {
  await Promise.all([ensureTable(), ensureUsersTable()]);

  const [totals, users, daily, byGroup] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS papers,
              COUNT(DISTINCT ${PERSON})::int AS people,
              COALESCE(ROUND(AVG(percentage)), 0)::int AS avg_pct,
              COUNT(DISTINCT (section_id || '/' || group_id || '/' || subject_id || '/' || mock_num))::int AS tests,
              COUNT(*) FILTER (WHERE ${DAY} = ${TODAY})::int AS papers_today,
              COUNT(DISTINCT ${PERSON}) FILTER (WHERE ${DAY} = ${TODAY})::int AS people_today,
              COUNT(*) FILTER (WHERE ${DAY} > ${TODAY} - 7)::int AS papers_7d,
              COUNT(DISTINCT ${PERSON}) FILTER (WHERE ${DAY} > ${TODAY} - 7)::int AS people_7d,
              COUNT(*) FILTER (WHERE ${DAY} > ${TODAY} - 30)::int AS papers_30d,
              COUNT(DISTINCT ${PERSON}) FILTER (WHERE ${DAY} > ${TODAY} - 30)::int AS people_30d,
              COUNT(*) FILTER (WHERE user_id IS NOT NULL)::int AS papers_signed_in
         FROM submissions`
    ),
    query(
      `SELECT COUNT(*)::int AS accounts,
              COUNT(*) FILTER (WHERE ${DAY} > ${TODAY} - 7)::int AS accounts_7d,
              COUNT(*) FILTER (WHERE google_sub IS NOT NULL)::int AS google,
              COUNT(*) FILTER (WHERE password_hash IS NOT NULL)::int AS password,
              COUNT(*) FILTER (WHERE phone IS NOT NULL)::int AS phone,
              COUNT(*) FILTER (WHERE google_sub IS NULL AND password_hash IS NULL AND phone IS NULL)::int AS email_code
         FROM users`
    ),
    // Every day in the range, including the ones with nothing on them.
    query(
      `SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
              COUNT(s.id)::int AS papers,
              COUNT(DISTINCT ${PERSON})::int AS people
         FROM generate_series(${TODAY} - ($1::int - 1), ${TODAY}, interval '1 day') AS d(day)
         LEFT JOIN submissions s ON ${DAY} = d.day::date
        GROUP BY d.day
        ORDER BY d.day`,
      [days]
    ),
    query(
      `SELECT group_id,
              COUNT(*)::int AS papers,
              COUNT(DISTINCT ${PERSON})::int AS people,
              SUM(percentage)::int AS pct_sum
         FROM submissions
        GROUP BY group_id`
    ),
  ]);

  // Several UP TET group ids fold into the one exam.
  const exams = new Map(EXAMS.map((e) => [e.id, { ...e, papers: 0, people: 0, pctSum: 0 }]));
  for (const r of byGroup.rows) {
    const e = exams.get(examOfGroup(r.group_id).id);
    e.papers += r.papers;
    // Summed per group, so someone in two UP TET groups counts twice; close
    // enough for a bar, and the headline count above is exact.
    e.people += r.people;
    e.pctSum += r.pct_sum || 0;
  }

  return {
    days,
    totals: totals.rows[0],
    users: users.rows[0],
    daily: daily.rows,
    exams: [...exams.values()]
      .filter((e) => e.papers > 0)
      .map(({ pctSum, ...e }) => ({ ...e, avg_pct: Math.round(pctSum / e.papers) }))
      .sort((a, b) => b.papers - a.papers),
  };
}

/** Every paper that has been sat at least once, most attempted first. */
export async function getTestStats() {
  await ensureTable();
  const { rows } = await query(
    `SELECT section_id, group_id, subject_id, mock_num,
            MAX(section_name) AS section_name,
            MAX(subject_name) AS subject_name,
            COUNT(*)::int AS attempts,
            COUNT(DISTINCT ${PERSON})::int AS people,
            ROUND(AVG(percentage))::int AS avg_pct,
            MAX(percentage)::int AS best_pct,
            MIN(percentage)::int AS worst_pct,
            ROUND(AVG(duration_seconds))::int AS avg_seconds,
            MAX(created_at) AS last_at
       FROM submissions
      GROUP BY section_id, group_id, subject_id, mock_num
      ORDER BY attempts DESC, last_at DESC`
  );
  return rows.map((r) => ({ ...r, exam: examOfGroup(r.group_id) }));
}

const PEOPLE_MAX = 2000;

/**
 * Everyone who has sat a paper, plus every account that has not yet - one row
 * per person, most recently active first.
 */
export async function getPeople() {
  await Promise.all([ensureTable(), ensureUsersTable()]);
  const [takers, accounts] = await Promise.all([
    query(
      `SELECT ${PERSON} AS key,
              MAX(user_id) AS user_id,
              (array_agg(name ORDER BY created_at DESC))[1] AS name,
              (array_agg(email ORDER BY created_at DESC) FILTER (WHERE email IS NOT NULL))[1] AS email,
              COUNT(*)::int AS papers,
              COUNT(DISTINCT (section_id || '/' || group_id || '/' || subject_id || '/' || mock_num))::int AS tests,
              ROUND(AVG(percentage))::int AS avg_pct,
              MAX(percentage)::int AS best_pct,
              MIN(created_at) AS first_at,
              MAX(created_at) AS last_at,
              array_agg(DISTINCT group_id) AS groups
         FROM submissions
        GROUP BY 1
        ORDER BY last_at DESC
        LIMIT $1`,
      [PEOPLE_MAX]
    ),
    query(
      `SELECT id, name, email, phone, created_at, last_login_at,
              google_sub IS NOT NULL AS has_google,
              password_hash IS NOT NULL AS has_password
         FROM users
        ORDER BY created_at DESC
        LIMIT $1`,
      [PEOPLE_MAX]
    ),
  ]);

  const account = new Map(accounts.rows.map((u) => [u.id, u]));
  const signIn = (u) =>
    [u.has_google && "Google", u.has_password && "Password", u.phone && "Mobile"].filter(Boolean).join(" + ") ||
    "Email code";

  const people = takers.rows.map(({ groups, user_id, ...p }) => {
    const u = user_id ? account.get(user_id) : null;
    if (u) account.delete(user_id);
    return {
      ...p,
      name: u?.name || p.name,
      email: u?.email || p.email,
      phone: u?.phone || null,
      exams: [...new Set(groups.map((g) => examOfGroup(g).name))],
      account: u ? { signIn: signIn(u), joined_at: u.created_at, last_login_at: u.last_login_at } : null,
    };
  });

  // Accounts with no paper to their name yet.
  for (const u of account.values()) {
    people.push({
      key: `u:${u.id}`,
      name: u.name,
      email: u.email,
      phone: u.phone,
      papers: 0,
      tests: 0,
      avg_pct: null,
      best_pct: null,
      first_at: null,
      last_at: null,
      exams: [],
      account: { signIn: signIn(u), joined_at: u.created_at, last_login_at: u.last_login_at },
    });
  }
  return people;
}

export const PAGE_SIZE = 50;
const SORTS = {
  newest: "created_at DESC",
  oldest: "created_at ASC",
  highest: "percentage DESC, created_at DESC",
  lowest: "percentage ASC, created_at DESC",
};

/**
 * One page of finished papers, filtered. `person` is a key from getPeople();
 * `test` is "section/group/subject/mock".
 */
export async function findSubmissions({ q, exam, person, test, sort, page = 1, limit = PAGE_SIZE } = {}) {
  await ensureTable();
  const where = [];
  const params = [];

  if (q) {
    params.push(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
    where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR subject_name ILIKE $${params.length})`);
  }
  if (exam) examFilter(exam, where, params);
  if (person) {
    params.push(person);
    where.push(`${PERSON} = $${params.length}`);
  }
  if (test) {
    const [section, group, subject, mock] = test.split("/");
    params.push(section, group, subject, parseInt(mock, 10) || 0);
    const n = params.length;
    where.push(`section_id = $${n - 3} AND group_id = $${n - 2} AND subject_id = $${n - 1} AND mock_num = $${n}`);
  }

  const cond = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const offset = (Math.max(1, page) - 1) * limit;
  const [list, count] = await Promise.all([
    query(
      `SELECT id, name, email, user_id, section_id, section_name, group_id, group_name,
              subject_id, subject_name, mock_num, total, correct, wrong, skipped,
              percentage, duration_seconds, created_at, ${PERSON} AS person
         FROM submissions
         ${cond}
        ORDER BY ${SORTS[sort] || SORTS.newest}
        LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    query(
      `SELECT COUNT(*)::int AS total, COALESCE(ROUND(AVG(percentage)), 0)::int AS avg_pct,
              MAX(percentage)::int AS best_pct
         FROM submissions ${cond}`,
      params
    ),
  ]);

  return {
    submissions: list.rows.map((r) => ({ ...r, exam: examOfGroup(r.group_id).name })),
    ...count.rows[0],
    page: Math.max(1, page),
    pages: Math.max(1, Math.ceil(count.rows[0].total / limit)),
  };
}

const EXPORT_MAX = 20000;

/** Every row matching the same filters, newest first, for the CSV download. */
export async function exportSubmissions(filters) {
  return (await findSubmissions({ ...filters, page: 1, limit: EXPORT_MAX })).submissions;
}
