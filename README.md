# UPTET Mock Test

A quiz web app (Next.js) built from the UPTET question banks in the Excel files.

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

Requirements: **Node.js** and **Python** (with `openpyxl`).

```bash
# 1. (only when the Excel files change) regenerate the quiz data
python build_data.py        # or: npm run data

# 2. install dependencies (first time only)
npm install

# 3. start the app
npm run dev
```

Then open <http://localhost:3000>.

## How it's wired

| Path | What it is |
|------|------------|
| `paper1_section_wise.xlsx`, `paper2_science.xlsx`, `paper2_sst.xlsx` | Source question banks |
| `build_data.py` | Converts the Excel sheets → JSON. Cleans up the messy "Correct Answer" formats and de-duplicates questions. |
| `public/data/manifest.json` | Navigation tree (papers → streams → subjects → mock counts) |
| `public/data/questions/*.json` | One file per subject; a mock paper is a 30-question slice |
| `app/` | Next.js App Router pages (navigation + quiz) |

To change the questions-per-paper, edit `MOCK_SIZE` in `build_data.py` and re-run it.
