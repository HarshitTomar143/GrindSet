"""Parse the MP Police Constable workbooks in ./cet/mp-police into ./seed_data_mp_police.

Usage: python build_mp_police_data.py   (then upload_mp_police_diagrams.mjs, seed_mp_police.mjs)

A parallel pipeline: it reads only cet/mp-police (+ one docx in cet/) and writes
only seed_data_mp_police/. The UPTET and CTET pipelines are never touched.

What makes this bank different from the others is the diagrams. A paper's
questions live in one workbook; its figures live in a *separate* workbook
(`Diagram_<date>_<shift>.xlsx`) as PNGs anchored to rows, each row repeating the
question number, stem and options. File names do not say which question
workbook a diagram workbook belongs to, and stock stems ("Find the number of
triangles in the given figure.") repeat in every sitting, so nothing here is
matched by guesswork:

  * SITTINGS pins every question workbook to its diagram workbook by hand.
  * Each diagram row is then re-checked against the question it is about to be
    attached to - same Q number, same stem, same options. Any mismatch aborts
    the build instead of attaching a picture to the wrong question.
  * Every image must be anchored to exactly one data row, one image per row.

Outputs
  seed_data_mp_police/rows.json           one object per question
  seed_data_mp_police/diagrams/<key>      the PNGs, laid out as their R2 keys
  seed_data_mp_police/diagram_map.json    audit trail: question -> image -> source
  seed_data_mp_police/diagram_review.html every figure beside its question, for eyeballing
  seed_data_mp_police/manifest.json       totals
"""

import difflib
import hashlib
import html
import io
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

import openpyxl
from PIL import Image

ROOT = Path(__file__).parent
SRC = ROOT / "cet" / "mp-police"
OUT = ROOT / "seed_data_mp_police"
EXAM_ID = "mp-police"
KEY_PREFIX = "mp-police"  # R2 key prefix; the bucket can be shared with other banks

# (sitting id, exam date, shift, question workbook, diagram workbook)
# Pairs were established by matching stem + options of every diagram row against
# every question workbook, then confirmed by looking at each image.
SITTINGS = [
    ("2023-08-23-s1", "2023-08-23", 1, "MP_Police_Constable_2023_Shift-I.xlsx", "mcq's/CET_Questions_with_Diagrams.xlsx"),
    ("2023-08-23-s2", "2023-08-23", 2, "mp_police_constable_2023_shift2.xlsx", "Diagram_23-08-2023_shift-II.xlsx"),
    ("2023-08-23-s3", "2023-08-23", 3, "exam.xlsx", "Diagram_23-08-2023_shift-III.xlsx"),
    ("2023-08-24-s2", "2023-08-24", 2, "questions.xlsx", "Diagram_24-08-2023_shift-II.xlsx"),
    ("2023-08-24-s3", "2023-08-24", 3, "mcq's/mp_police_2023_shift3.xlsx", "Diagram_24-08-2023_Shift-III.xlsx"),
    ("2023-08-25-s1", "2023-08-25", 1, "mcq's/mp_police_2023_shift1.xlsx", "Diagram_25-08-2023_Shift-I.xlsx"),
    ("2023-08-25-s2", "2023-08-25", 2, "mcq's/mp_police_2023_shift2.xlsx", "Diagram_25-08-2023_Shift-II.xlsx"),
    ("2023-08-25-s3", "2023-08-25", 3, "mcq's/mp_police_constable_2023_shift3.xlsx", "Diagram_25-08-2023_Shift-III.xlsx"),
    ("2023-08-26-s2", "2023-08-26", 2, "mcq's/mcq.xlsx", "Diagram_26-08-2023_Shift-II.xlsx"),
    ("2023-08-26-s3", "2023-08-26", 3, "mcq's/mp_police_2023_shift3 (2).xlsx", "Diagram_26-08-2023_Shist-III.xlsx"),
    ("2023-08-27-s1", "2023-08-27", 1, "mcq's/mp_police_2023_shift1 (2).xlsx", "Diagram_27-08-2023_Shift-I.xlsx"),
    ("2023-08-27-s2", "2023-08-27", 2, "mcq's/mp_police_2023_shift2 (2).xlsx", "Diagram_27-08-2023_Shift-II.xlsx"),
    ("2023-08-27-s3", "2023-08-27", 3, "mcq's/mp_police_2023_shift3 (1).xlsx", "Diagram_27-08-2023_Shift-III.xlsx"),
    ("2023-08-28-s2", "2023-08-28", 2, "mcq's/mp_police_2023_shift2 (1).xlsx", "Diagram_28-08-2023_Shift-II.xlsx"),
    ("2023-08-28-s3", "2023-08-28", 3, "mp_police_2023_shift3.xlsx", "Diagram_28-08-2023_Shift-III.xlsx"),
    # 2025 papers: the Figure column points at fig_qNN.png files that were never
    # supplied, so these have no diagram workbook. Their figure questions are
    # loaded but held back (skip_reason 'diagram_missing') until the images arrive.
    ("2025-11-06-s1", "2025-11-06", 1, "MP_Police_Constable_06-11-2025_Shift-I.xlsx", None),
    ("2025-11-07-s1", "2025-11-07", 1, "MP_Police_Constable_07-11-2025_Shift-I.xlsx", None),
    ("2025-11-08-s1", "2025-11-08", 1, "MP_Police_Constable_08-11-2025_Shift-I.xlsx", None),
    ("2025-11-10-s2", "2025-11-10", 2, "MP_Police_Constable_10-Nov-2025_Shift-II.xlsx", None),
    ("2025-11-11-s2", "2025-11-11", 2, "MP_Police_Constable_11-11-2025_Shift-II.xlsx", None),
    ("2025-11-12-s1", "2025-11-12", 1, "MP_Police_Constable_12-11-2025_Shift-I.xlsx", None),
    ("2025-11-13-s2", "2025-11-13", 2, "MP_Police_Constable_13-11-2025_Shift-II.xlsx", None),
    ("2025-11-17-s1", "2025-11-17", 1, "MP_Police_Constable_17-11-2025_Shift-I.xlsx", None),
    ("2025-11-18-s2", "2025-11-18", 2, "MP_Police_Constable_18-11-2025_Shift-II.xlsx", None),
    ("2025-11-22-s1", "2025-11-22", 1, "MP_Police_Constable_22-11-2025_Shift-I.xlsx", None),
    # The file name gives no date, only "2025 shift1".
    ("2025-undated-s1", None, 1, "19_mp_police_2025_shift1.xlsx", None),
]

# Workbooks deliberately not loaded, with the reason (reported, never silent).
SKIPPED = {
    "mcq's/mp_constable_2023_shift2.xlsx": "98% identical to mp_police_2023_shift2.xlsx (25-08-2023 Shift-II)",
    "mcq's/mp_police_constable_2023.xlsx": "earlier draft of the 25-08-2023 Shift-II paper (91% identical)",
    "mcq's/CET_Questions_with_Diagrams (1).xlsx": "re-export of CET_Questions_with_Diagrams.xlsx",
}

# In these rows the diagram workbook's crop kept only the question figure and
# lost the (a)-(d) answer figures, which makes the question unanswerable. The
# matching .docx holds the uncropped original (with the printed question
# number), so that image is used instead. The md5 pins the exact picture that
# was looked at: if the docx is ever re-exported the build stops rather than
# silently picking up a different image.
DOCX_OVERRIDES = {
    "2023-08-23-s2": ("Diagram 23-08-2023 shift-II.docx", {
        46: ("image4.png", "19af3c"),
        51: ("image8.png", "c58211"),
    }),
    "2023-08-24-s2": ("Diagram 24-08-2023 shift-II.docx", {
        47: ("image4.png", "e894a2"),
        46: ("image5.png", "a9e478"),
        53: ("image9.png", "6e81f5"),
        72: ("image10.png", "f19920"),
    }),
}

# Figures supplied one at a time (not in any diagram workbook), kept in
# cet/mp-police/extra-diagrams/. There is no row text to verify these against,
# so each one is pinned by md5 to the picture that was checked by eye against
# the question. The third value, when set, holds the question back anyway and
# says why.
EXTRA_DIAGRAMS = {
    # shows (5y + 10) and 2x on line AB - the figure the explanation works from
    ("2023-08-26-s3", 89): ("2023-08-26-s3_q089.png", "e0dac9", None),
    # the arrow series with its (a)-(d) answer figures
    ("2023-08-28-s3", 52): ("2023-08-28-s3_q052.png", "e4ce9d", None),
}

HEADER_ALIASES = {
    "q_no": ["Q No", "Q.No", "Q_No", "Q. No."],
    "section": ["Section"],
    "section_hi": ["Section (Hindi)", "Section (HI)"],
    "question_en": ["Question (EN)", "Question (English)", "Question"],
    "question_hi": ["Question (HI)", "Question (Hindi)"],
    "option_a_en": ["Option A (EN)", "A (EN)", "Option A"],
    "option_b_en": ["Option B (EN)", "B (EN)", "Option B"],
    "option_c_en": ["Option C (EN)", "C (EN)", "Option C"],
    "option_d_en": ["Option D (EN)", "D (EN)", "Option D"],
    "option_a_hi": ["Option A (HI)", "A (HI)", "Option A (Hindi)"],
    "option_b_hi": ["Option B (HI)", "B (HI)", "Option B (Hindi)"],
    "option_c_hi": ["Option C (HI)", "C (HI)", "Option C (Hindi)"],
    "option_d_hi": ["Option D (HI)", "D (HI)", "Option D (Hindi)"],
    "answer": ["Answer"],
    "official_key": ["Official Key"],
    "answer_disputed": ["Answer Disputed"],
    "explanation_en": ["Explanation (EN)", "Explanation"],
    "explanation_hi": ["Explanation (HI)", "Explanation (Hindi)"],
    "figure": ["Figure"],
    "note": ["Note"],
    "diagram": ["Diagram"],
}
KNOWN_HEADERS = {h for names in HEADER_ALIASES.values() for h in names}

# Option text that only says "look at the picture".
FIGURE_PLACEHOLDER = re.compile(
    r"^\W*(\(?[a-d]\)?\W*)?(figure|see figure|see image|option|symbol)\b", re.I
)
# Stems that talk about a picture; used only to *report* questions that may
# need a figure nobody marked.
MENTIONS_FIGURE = re.compile(
    r"\b(given|following|above|below)\s+(figure|figures|diagram|venn|circuit)\b|\bfigure\s+(given|below)\b"
    r"|\bmirror image\b|\bgiven below\?", re.I
)


class BuildError(Exception):
    pass


def clean(v):
    if v is None:
        return None
    s = str(v).replace("\r\n", "\n").strip()
    return s or None


def norm(s):
    """Lowercase alphanumerics only, so spacing/punctuation differences vanish."""
    s = str(s or "").lower().replace("°", " degrees").replace("∠", " angle ")
    return re.sub(r"[\W_]+", "", s)


def english_half(s):
    """Diagram workbooks write bilingual options as 'EN / HI'; '(a) 22' as well."""
    s = str(s or "")
    s = re.sub(r"^\s*\(?[a-dA-D]\)\s*", "", s)
    hindi = re.search(r"[ऀ-ॿ]", s)
    if hindi:
        # cut at the slash that introduces the Hindi half ('T.V./रिमोट', '8 units / 8 इकाइयाँ')
        slash = s.rfind("/", 0, hindi.start())
        if slash >= 0:
            s = s[:slash]
    return s


def read_sheet(path, sheet_index=0):
    """-> (column map, list of (excel row number, tuple of cell values))."""
    wb = openpyxl.load_workbook(path)
    ws = wb.worksheets[sheet_index]
    header = [clean(c.value) for c in ws[1]]
    unknown = [h for h in header if h and h not in KNOWN_HEADERS]
    if unknown:
        raise BuildError(f"{path.name}: unrecognised column(s) {unknown}")
    col = {}
    for field, names in HEADER_ALIASES.items():
        for n in names:
            if n in header:
                col[field] = header.index(n)
                break
    rows = [
        (i, tuple(c.value for c in r))
        for i, r in enumerate(ws.iter_rows(min_row=2), start=2)
        if any(c.value not in (None, "") for c in r)
    ]
    return wb, ws, col, rows


def parse_answer(raw, disputed_flag):
    """-> (correct letter or None, is_disputed)."""
    s = (clean(raw) or "").upper()
    disputed = bool(clean(disputed_flag)) and clean(disputed_flag).lower() not in ("no", "false")
    if s in ("A", "B", "C", "D"):
        return s, disputed
    if s:
        disputed = True  # 'Disputed', '* (see note)' ...
    return None, disputed


def load_questions(sitting_id, exam_date, shift, rel):
    path = SRC / rel
    wb, ws, col, rows = read_sheet(path)
    for needed in ("q_no", "question_en", "option_a_en", "option_d_en", "answer"):
        if needed not in col:
            raise BuildError(f"{rel}: missing required column for '{needed}'")

    # Shift-I 2023 keeps its notes on a second sheet keyed by question number.
    side_notes = {}
    if "Notes" in wb.sheetnames:
        for r in wb["Notes"].iter_rows(min_row=2, values_only=True):
            if r and r[0] is not None:
                side_notes[int(str(r[0]).strip())] = clean(r[1])

    out = {}
    for rownum, r in rows:
        get = lambda f: clean(r[col[f]]) if f in col and col[f] < len(r) else None
        try:
            q_no = int(str(r[col["q_no"]]).strip())
        except (TypeError, ValueError):
            raise BuildError(f"{rel} row {rownum}: question number {r[col['q_no']]!r} is not a number")
        if q_no in out:
            raise BuildError(f"{rel}: question number {q_no} appears twice")
        correct, disputed = parse_answer(get("answer"), get("answer_disputed"))
        note = get("note") or side_notes.get(q_no)
        if note and re.search(r"disputed", note, re.I):
            disputed = True
        out[q_no] = {
            "exam_id": EXAM_ID,
            "sitting_id": sitting_id,
            "exam_year": int(sitting_id[:4]),
            "exam_date": exam_date,
            "shift": shift,
            "q_no": q_no,
            "section": get("section"),
            "section_hi": get("section_hi"),
            "question_en": get("question_en"),
            "question_hi": get("question_hi"),
            **{f"option_{k}_en": get(f"option_{k}_en") for k in "abcd"},
            **{f"option_{k}_hi": get(f"option_{k}_hi") for k in "abcd"},
            "correct": correct,
            "answer_raw": get("answer"),
            "official_key": get("official_key"),
            "is_disputed": disputed,
            "explanation_en": get("explanation_en"),
            "explanation_hi": get("explanation_hi"),
            "note": note,
            "figure_ref": get("figure"),
            "has_figure": bool(get("figure")),
            "options_are_figures": False,
            "diagram_key": None,
            "diagram_width": None,
            "diagram_height": None,
            "source_file": rel,
            "source_row": rownum,
        }
    return out


def check_match(sitting_id, drel, drow, q_no, d_stem, d_opts, q):
    """Prove a diagram row and a question are the same question, or abort."""
    where = f"{sitting_id}: {drel} row {drow} (Q{q_no})"
    ds, qs = norm(d_stem), norm(q["question_en"])
    if not ds or not qs:
        raise BuildError(f"{where}: empty question text, cannot verify the pairing")
    # The question workbook sometimes appends a description of the figure.
    # Word-level as well: one workbook tidies the grammar ("students studies" ->
    # "students who study"), which shifts every character but few words.
    dw = re.findall(r"\w+", d_stem.lower())
    qw = re.findall(r"\w+", (q["question_en"] or "").lower())
    stem_score = max(
        difflib.SequenceMatcher(None, ds, qs, autojunk=False).ratio(),
        difflib.SequenceMatcher(None, ds, qs[: len(ds)], autojunk=False).ratio(),
        difflib.SequenceMatcher(None, dw, qw, autojunk=False).ratio(),
    )
    compared = matched = 0
    for k, d_opt in zip("abcd", d_opts):
        q_opt = q[f"option_{k}_en"]
        if not clean(d_opt) or FIGURE_PLACEHOLDER.match(str(d_opt)) or str(d_opt).strip() == "[figure]":
            continue  # the option is itself a picture - nothing to compare
        compared += 1
        a, b = norm(english_half(d_opt)), norm(q_opt)
        if a == b or (a and b and difflib.SequenceMatcher(None, a, b).ratio() >= 0.85):
            matched += 1
    if compared and matched < compared:
        raise BuildError(
            f"{where}: options differ from {q['source_file']} row {q['source_row']}\n"
            f"    diagram : {d_stem!r} {list(d_opts)}\n"
            f"    question: {q['question_en']!r} {[q[f'option_{k}_en'] for k in 'abcd']}"
        )
    if stem_score < (0.70 if compared else 0.85):
        raise BuildError(
            f"{where}: stem differs from {q['source_file']} row {q['source_row']} (similarity {stem_score:.2f})\n"
            f"    diagram : {d_stem!r}\n    question: {q['question_en']!r}"
        )
    return round(stem_score, 3), compared


def docx_image(docx_rel, media_name, md5_prefix):
    path = SRC / docx_rel
    with zipfile.ZipFile(path) as z:
        data = z.read(f"word/media/{media_name}")
    got = hashlib.md5(data).hexdigest()
    if not got.startswith(md5_prefix):
        raise BuildError(
            f"{docx_rel}: {media_name} has changed (md5 {got[:6]}, expected {md5_prefix}); "
            "re-check which picture belongs to which question before rebuilding"
        )
    return data


def attach_diagrams(sitting_id, questions, drel, diagram_map):
    path = SRC / drel
    _, ws, col, rows = read_sheet(path)
    for needed in ("q_no", "question_en", "option_a_en"):
        if needed not in col:
            raise BuildError(f"{drel}: missing column for '{needed}'")

    by_row = {}
    for im in ws._images:
        anchor = im.anchor._from
        by_row.setdefault(anchor.row + 1, []).append(im)

    data_rows = {rownum for rownum, _ in rows}
    stray = sorted(set(by_row) - data_rows)
    if stray:
        raise BuildError(f"{drel}: image(s) anchored to row(s) {stray}, which hold no question")

    docx_rel, overrides = DOCX_OVERRIDES.get(sitting_id, (None, {}))
    seen_q = set()
    for rownum, r in rows:
        try:
            q_no = int(str(r[col["q_no"]]).strip())
        except (TypeError, ValueError):
            raise BuildError(f"{drel} row {rownum}: question number {r[col['q_no']]!r} is not a number")
        if q_no in seen_q:
            raise BuildError(f"{drel}: question {q_no} listed twice")
        seen_q.add(q_no)
        imgs = by_row.get(rownum, [])
        if len(imgs) != 1:
            raise BuildError(f"{drel} row {rownum} (Q{q_no}): expected exactly 1 image, found {len(imgs)}")
        q = questions.get(q_no)
        if q is None:
            raise BuildError(f"{drel} row {rownum}: Q{q_no} does not exist in the question workbook")
        d_stem = clean(r[col["question_en"]])
        d_opts = [r[col[f"option_{k}_en"]] for k in "abcd"]
        stem_score, compared = check_match(sitting_id, drel, rownum, q_no, d_stem, d_opts, q)

        source = f"{drel} row {rownum}"
        data = imgs[0]._data()
        if q_no in overrides:
            media_name, md5_prefix = overrides[q_no]
            data = docx_image(docx_rel, media_name, md5_prefix)
            source = f"{docx_rel} {media_name} (uncropped original; the xlsx crop lost the answer figures)"

        pil = Image.open(io.BytesIO(data))
        pil.verify()
        if pil.format != "PNG":
            raise BuildError(f"{source}: expected a PNG, got {pil.format}")
        digest = hashlib.md5(data).hexdigest()
        key = f"{KEY_PREFIX}/{sitting_id}/q{q_no:03d}-{digest[:8]}.png"
        dest = OUT / "diagrams" / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)

        q["has_figure"] = True
        q["diagram_key"] = key
        q["diagram_width"], q["diagram_height"] = pil.size
        q["options_are_figures"] = all(
            str(o or "").strip() == "[figure]" or FIGURE_PLACEHOLDER.match(str(o or "")) for o in d_opts
        )
        if not q["question_hi"] and "question_hi" in col:
            q["question_hi"] = clean(r[col["question_hi"]])

        diagram_map.append({
            "sitting_id": sitting_id,
            "q_no": q_no,
            "key": key,
            "bytes": len(data),
            "md5": digest,
            "width": pil.size[0],
            "height": pil.size[1],
            "image_source": source,
            "question_source": f"{q['source_file']} row {q['source_row']}",
            "stem_similarity": stem_score,
            "options_compared": compared,
            # Figure-only options leave nothing but the stem to compare, and a
            # few stems repeat within one paper: those rest on the Q number.
            "verified_by": "stem+options" if compared else "stem+question number",
            "question_en": q["question_en"],
        })

    # A figure the question workbook asks for but the diagram workbook lacks.
    return sorted(n for n, q in questions.items() if q["has_figure"] and not q["diagram_key"])


def attach_extras(sitting_id, questions, diagram_map):
    for (sid, q_no), (name, md5_prefix, hold) in EXTRA_DIAGRAMS.items():
        if sid != sitting_id:
            continue
        q = questions[q_no]
        if q["diagram_key"]:
            raise BuildError(f"{sid} Q{q_no}: already has a diagram from its workbook; remove the EXTRA_DIAGRAMS entry")
        if not q["has_figure"]:
            raise BuildError(f"{sid} Q{q_no}: the question workbook does not mark this question as needing a figure")
        data = (SRC / "extra-diagrams" / name).read_bytes()
        digest = hashlib.md5(data).hexdigest()
        if not digest.startswith(md5_prefix):
            raise BuildError(f"extra-diagrams/{name} has changed (md5 {digest[:6]}, expected {md5_prefix})")
        pil = Image.open(io.BytesIO(data))
        if pil.format != "PNG":
            raise BuildError(f"extra-diagrams/{name}: expected a PNG, got {pil.format}")
        key = f"{KEY_PREFIX}/{sid}/q{q_no:03d}-{digest[:8]}.png"
        dest = OUT / "diagrams" / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        q["diagram_key"] = key
        q["diagram_width"], q["diagram_height"] = pil.size
        q["options_are_figures"] = all(FIGURE_PLACEHOLDER.match(q[f"option_{k}_en"] or "") for k in "abcd")
        q["hold_reason"] = hold
        diagram_map.append({
            "sitting_id": sid, "q_no": q_no, "key": key, "bytes": len(data), "md5": digest,
            "width": pil.size[0], "height": pil.size[1],
            "image_source": f"extra-diagrams/{name} (supplied separately)",
            "question_source": f"{q['source_file']} row {q['source_row']}",
            "stem_similarity": None, "options_compared": 0,
            "verified_by": "checked by eye, pinned by md5",
            "question_en": q["question_en"],
        })


def finalise(q):
    opts = [q[f"option_{k}_en"] or q[f"option_{k}_hi"] for k in "abcd"]
    reason = None
    if not (q["question_en"] or q["question_hi"]):
        reason = "no_question"
    elif not all(opts):
        reason = "missing_option"
    elif q["has_figure"] and not q["diagram_key"]:
        reason = "diagram_missing"
    elif q.get("hold_reason"):
        reason = q["hold_reason"]
    elif q["correct"] is None:
        reason = "disputed" if q["is_disputed"] else "no_answer"
    q.pop("hold_reason", None)
    q["is_gradable"] = reason is None
    q["skip_reason"] = reason
    q["diagram_status"] = "ok" if q["diagram_key"] else ("missing" if q["has_figure"] else "none")


def write_review(rows):
    parts = [
        "<!doctype html><meta charset='utf-8'><title>MP Police diagram review</title>",
        "<style>body{font:14px/1.45 system-ui,sans-serif;margin:24px;color:#111;background:#fff}"
        "h2{margin:32px 0 8px;border-bottom:1px solid #ccc}.q{display:grid;grid-template-columns:minmax(260px,1fr) 1fr;"
        "gap:16px;padding:12px 0;border-bottom:1px solid #eee}img{max-width:100%;border:1px solid #ddd}"
        "small{color:#666}ol{margin:6px 0 0;padding-left:20px}.ok{color:#0a7}</style>",
        "<h1>MP Police Constable - every diagram beside the question it is attached to</h1>",
    ]
    sitting = None
    for q in rows:
        if not q["diagram_key"]:
            continue
        if q["sitting_id"] != sitting:
            sitting = q["sitting_id"]
            parts.append(f"<h2>{html.escape(sitting)} <small>{html.escape(q['source_file'])}</small></h2>")
        opts = "".join(
            f"<li{' class=ok' if q['correct'] == k.upper() else ''}>{html.escape(q[f'option_{k}_en'] or '')}</li>"
            for k in "abcd"
        )
        parts.append(
            f"<div class=q><div><b>Q{q['q_no']}</b> <small>{html.escape(q['section'] or '')}</small><br>"
            f"{html.escape(q['question_en'] or '')}<br><small>{html.escape(q['question_hi'] or '')}</small>"
            f"<ol type=A>{opts}</ol></div><div><img src='diagrams/{html.escape(q['diagram_key'])}'><br>"
            f"<small>{html.escape(q['diagram_key'])}</small></div></div>"
        )
    (OUT / "diagram_review.html").write_text("\n".join(parts), encoding="utf-8")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if (OUT / "diagrams").exists():
        shutil.rmtree(OUT / "diagrams")
    OUT.mkdir(exist_ok=True)

    # Every xlsx in the folder must be accounted for: used, a diagram workbook
    # in use, or listed in SKIPPED. A new file can't slip by unnoticed.
    used = {s[3] for s in SITTINGS} | {s[4] for s in SITTINGS if s[4]} | set(SKIPPED)
    on_disk = {p.relative_to(SRC).as_posix() for p in SRC.rglob("*.xlsx") if not p.name.startswith("~$")}
    unaccounted = sorted(on_disk - used)
    if unaccounted:
        raise BuildError(f"workbook(s) not listed in SITTINGS or SKIPPED: {unaccounted}")
    missing = sorted(used - on_disk)
    if missing:
        raise BuildError(f"workbook(s) listed but not found in {SRC}: {missing}")

    all_rows, diagram_map, sittings_out, warnings = [], [], [], []
    for sitting_id, exam_date, shift, qrel, drel in SITTINGS:
        questions = load_questions(sitting_id, exam_date, shift, qrel)
        if sorted(questions) != list(range(1, 101)):
            raise BuildError(f"{qrel}: expected questions 1-100, got {len(questions)} rows")
        unmatched = attach_diagrams(sitting_id, questions, drel, diagram_map) if drel else sorted(
            n for n, q in questions.items() if q["has_figure"]
        )
        attach_extras(sitting_id, questions, diagram_map)
        unmatched = sorted(n for n, q in questions.items() if q["has_figure"] and not q["diagram_key"])
        for q in questions.values():
            finalise(q)
        rows = [questions[n] for n in sorted(questions)]
        all_rows.extend(rows)

        if unmatched:
            warnings.append(f"{sitting_id}: figure marked but no diagram supplied for Q{unmatched}")
        suspects = [
            q["q_no"] for q in rows
            if not q["has_figure"] and MENTIONS_FIGURE.search(q["question_en"] or "")
        ]
        if suspects:
            warnings.append(f"{sitting_id}: stem mentions a figure but none is marked or supplied: Q{suspects}")
        sittings_out.append({
            "sitting_id": sitting_id,
            "exam_date": exam_date,
            "shift": shift,
            "question_file": qrel,
            "diagram_file": drel,
            "questions": len(rows),
            "gradable": sum(q["is_gradable"] for q in rows),
            "diagrams": sum(1 for q in rows if q["diagram_key"]),
            "diagram_missing": unmatched,
        })

    keys = [d["key"] for d in diagram_map]
    if len(keys) != len(set(keys)):
        raise BuildError("two questions resolved to the same diagram key")

    skip_counts = {}
    for q in all_rows:
        if q["skip_reason"]:
            skip_counts[q["skip_reason"]] = skip_counts.get(q["skip_reason"], 0) + 1

    (OUT / "rows.json").write_text(json.dumps(all_rows, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "diagram_map.json").write_text(json.dumps(diagram_map, ensure_ascii=False, indent=1), encoding="utf-8")
    manifest = {
        "exam_id": EXAM_ID,
        "key_prefix": KEY_PREFIX,
        "totals": {
            "sittings": len(sittings_out),
            "rows": len(all_rows),
            "gradable": sum(q["is_gradable"] for q in all_rows),
            "diagrams": len(diagram_map),
            "diagram_bytes": sum(d["bytes"] for d in diagram_map),
            "skipped": skip_counts,
        },
        "sittings": sittings_out,
        "skipped_files": SKIPPED,
        "warnings": warnings,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    write_review(all_rows)

    print(f"{'sitting':16s} {'rows':>4s} {'gradable':>8s} {'diagrams':>8s}  question workbook")
    for s in sittings_out:
        print(f"{s['sitting_id']:16s} {s['questions']:4d} {s['gradable']:8d} {s['diagrams']:8d}  {s['question_file']}")
    t = manifest["totals"]
    print(f"\n{t['rows']} questions, {t['gradable']} gradable, {t['diagrams']} diagrams "
          f"({t['diagram_bytes'] / 1e6:.1f} MB). Held back: {skip_counts}")
    by = {}
    for d in diagram_map:
        by[d["verified_by"]] = by.get(d["verified_by"], 0) + 1
    print(f"Diagram pairing verified by: {by}")
    for w in warnings:
        print("WARN", w)
    print(f"\nWrote {OUT.name}/ - open {OUT.name}/diagram_review.html to eyeball every pairing.")


if __name__ == "__main__":
    try:
        main()
    except BuildError as e:
        print(f"\nBUILD ABORTED: {e}", file=sys.stderr)
        sys.exit(1)
