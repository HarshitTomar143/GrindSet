# 🐙 Octopus

A minimalist quiz web app (Next.js) for the UPTET question banks.
Questions are stored in **PostgreSQL** and seeded from the source Excel files.

## Flow

```
Home
 ├─ Paper 1
 │    └─ Subjects (Child Dev, Hindi, English, Sanskrit, Maths, EVS)
 │         └─ Mock Paper 1, 2, 3 …   (30 questions each)
 │              └─ Quiz → Submit → Report Card
 └─ Paper 2
      ├─ Science Stream
      │    └─ Subjects → Mock Papers → Quiz → Report Card
      └─ Social Studies Stream
           └─ Subjects → Mock Papers → Quiz → Report Card
```

- Each subject is split into **mock papers of 30 questions** (`ceil(total / 30)`).
- **Exam mode:** answer all questions, then **Submit** to see the report card.
- The **report card** shows score, correct / wrong / unattempted counts, and a full
  review with the correct answer and explanation (the "summary") for every question.
- Paper 2 questions show **both Hindi and English**.

## Running it

Requirements: **Node.js**, **Python** (with `openpyxl`), and a **PostgreSQL** database
(Neon, Supabase, Railway, or local).

```bash
# 1. configure the database
cp .env.example .env.local        # then set DATABASE_URL

# 2. install dependencies (first time only)
npm install

# 3. parse the Excel files and load them into the database
npm run setup                     # = python build_data.py && node seed.mjs

# 4. start the app
npm run dev
```

Then open <http://localhost:3000>.

Re-run `npm run setup` whenever the Excel files change. To reseed only (data already
parsed) use `npm run seed`.

## Admin panel

Visit **`/admin`** (also linked in the footer) to see all activity.

- Before starting any test, the taker enters their **name** (and optional email),
  remembered in their browser for next time.
- On submit, the result is saved to a **`submissions`** table (who, which test,
  score, correct/wrong/skipped, time taken, timestamp, and their answers).
- The dashboard shows totals, average score, most-attempted tests, and a
  searchable/sortable table of every submission. Click a row to see that person's
  full answer-by-answer review.
- Access is protected by **`ADMIN_PASSWORD`** in your env file. The login sets an
  httpOnly cookie for 8 hours.

The `submissions` table is created automatically on the first submission and is
**not** touched by `npm run seed` (reseeding questions never wipes activity).

## How it's wired

| Path | What it is |
|------|------------|
| `paper1_section_wise.xlsx`, `paper2_science.xlsx`, `paper2_sst.xlsx` | Source question banks |
| `build_data.py` | Parses the Excel sheets → `seed_data/*.json`. Cleans up the messy "Correct Answer" formats and de-duplicates questions. |
| `seed.mjs` | Loads `seed_data` into the `questions` table in PostgreSQL (`npm run seed`). |
| `lib/db.js` | PostgreSQL connection pool (reads `DATABASE_URL`). |
| `lib/data.js` | Builds the navigation tree and mock-paper slices with SQL queries. |
| `app/api/manifest`, `app/api/quiz` | API routes the quiz page calls in the browser. |
| `app/api/submit` | Records a finished test into the `submissions` table. |
| `lib/submissions.js` | Submission table + read queries for the admin panel. |
| `lib/admin.js`, `app/api/admin/*` | Admin password check, login/logout, and protected data routes. |
| `app/admin/` | Admin login + dashboard + per-submission detail. |
| `app/` | Next.js App Router pages (navigation + quiz). |

The `seed_data/` folder is a throwaway intermediate — at runtime the app reads only
from the database, never from those files.

To change the questions-per-paper, edit `MOCK_SIZE` in **both** `build_data.py` and
`lib/db.js`, then re-run `npm run setup`.
