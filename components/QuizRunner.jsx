"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pickLang } from "@/lib/lang";
import { uiText } from "@/lib/ui-text";
import {
  clearAttempt,
  readAttempt,
  recordResult,
  saveAttempt,
} from "@/lib/progress";

const LETTERS = ["A", "B", "C", "D"];
const SECONDS_PER_Q = 60; // exam mode: 1 minute per question (TET ratio)
const DEFAULT_PASS_PCT = 60; // the TET qualifying mark, for callers that pass none
const WARN_SECONDS = 5 * 60; // the clock turns amber here, red in the last minute

// Stored with the report, so these stay English whatever the reader sees;
// uiText().reportReasons holds the labels, in the same order.
const REPORT_REASONS = [
  "Wrong answer marked",
  "Typo or unclear wording",
  "Bad / missing options",
  "Duplicate question",
  "Other",
];

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

/** "1 min 12 s" — used for pace, where a bare m:ss reads like a clock. */
function fmtPace(s) {
  const whole = Math.round(s);
  if (whole < 60) return `${whole}s`;
  return `${Math.floor(whole / 60)}m ${String(whole % 60).padStart(2, "0")}s`;
}

/**
 * A question's diagram. Scanned line art, black on white, so it always sits on
 * a white plate - in dark mode a transparent or dark backing would lose it.
 */
function QuestionFigure({ image, alt }) {
  if (!image?.src) return null;
  return (
    <div className="q-figure">
      <img
        src={image.src}
        alt={alt}
        width={image.width || undefined}
        height={image.height || undefined}
        decoding="async"
      />
    </div>
  );
}

/**
 * The quiz screen, shared by every exam.
 *
 * Laid out like the computer-based test it is preparing for: the question on
 * the left, and on the right the candidate block, the clock, the counts and
 * the question palette. The CBT's own controls are here too — Save & Next,
 * Clear Response, Mark for Review — because those keystrokes are part of what
 * a candidate has to have in their fingers on the day.
 *
 * @param questions  loaded on the server; each may carry sectionLabel/sectionName
 * @param meta       display names + the hrefs used by breadcrumbs and Back
 * @param submitMeta ids stored with the result and with question reports
 * @param account    the signed-in candidate ({ name, email }) or null; when set
 *                   it replaces the typed name, and the server ties the result
 *                   to the account
 */
export default function QuizRunner({ questions, meta, submitMeta, mockNum, account = null }) {
  const [answers, setAnswers] = useState({}); // idx -> letter
  const [current, setCurrent] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  const [user, setUser] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [saveState, setSaveState] = useState("idle");

  const [mode, setMode] = useState("exam"); // exam | practice
  // Question language (both | en | hi): starts from the site language.
  const [lang, setLang] = useState(meta.uiLang || "both");
  const [marked, setMarked] = useState(() => new Set());
  const [visited, setVisited] = useState(() => new Set());

  const [report, setReport] = useState(null); // { index, reason, note, state }
  const [reviewFilter, setReviewFilter] = useState("all"); // all | wrong
  const [paperHref, setPaperHref] = useState("");
  const [resumeOffer, setResumeOffer] = useState(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);

  const autoSubmitRef = useRef(null);
  const paletteRef = useRef(null);
  // Keyboard handling is registered once and reads the live actions through a
  // ref, because the screen returns early for the gate and the report card and
  // a hook cannot be declared after those returns.
  const keysRef = useRef({ enabled: false });

  useEffect(() => {
    const onKey = (e) => {
      const k = keysRef.current;
      if (e.key === "Escape" && k.escape) {
        k.escape();
        e.preventDefault();
        return;
      }
      if (!k.enabled || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target?.closest?.("input, textarea, select, [contenteditable]")) return;

      const digit = "1234".indexOf(e.key);
      const letter = "abcd".indexOf(e.key.toLowerCase());
      if (digit > -1) k.choose(digit);
      else if (letter > -1) k.choose(letter);
      else if (e.key === "ArrowRight") k.next();
      else if (e.key === "ArrowLeft") k.prev();
      else if (e.key.toLowerCase() === "m") k.mark();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tr = (t) => pickLang(t, lang);
  // Copy for the screen itself, in the site language (hi | en | both).
  const T = uiText(meta.uiLang);
  // null means the exam publishes no qualifying mark, so no verdict is given.
  const passMark = meta.passMark === undefined ? DEFAULT_PASS_PCT : meta.passMark;

  const total = questions.length;
  const answeredCount = Object.keys(answers).length;

  // Sections only exist on full mock papers; a subject paper has none.
  const examSections = useMemo(() => {
    const seen = [];
    for (const q of questions) {
      if (q.sectionName && !seen.includes(q.sectionName)) seen.push(q.sectionName);
    }
    return seen;
  }, [questions]);

  // remember the test-taker + language preference (browser-local)
  useEffect(() => {
    if (account) {
      setUser({ name: account.name, email: account.email || "" });
    } else {
      try {
        const u = JSON.parse(localStorage.getItem("quizUser") || "null");
        if (u && u.name) setUser(u);
      } catch {}
    }
    const href = window.location.pathname + window.location.search;
    setPaperHref(href);
    const saved = readAttempt(href);
    if (saved && saved.answered > 0 && saved.total === total) setResumeOffer(saved);
  }, [total]);

  // Question language: the reader's own pick on this screen wins; otherwise it
  // follows the site language, including when that is switched mid-paper.
  // Kept apart from the effect above, which must not re-offer "Resume".
  useEffect(() => {
    try {
      const l = localStorage.getItem("quizLang");
      if (l === "en" || l === "hi" || l === "both") {
        setLang(l);
        return;
      }
    } catch {}
    setLang(meta.uiLang || "both");
  }, [meta.uiLang]);

  // timer: runs once identified, until submitted (counts elapsed)
  useEffect(() => {
    if (submitted || !user || resumeOffer) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [submitted, user, resumeOffer]);

  // exam mode: auto-submit when time runs out
  useEffect(() => {
    if (mode !== "exam" || submitted || !user) return;
    if (seconds >= total * SECONDS_PER_Q && autoSubmitRef.current) {
      autoSubmitRef.current();
    }
  }, [seconds, mode, submitted, total, user]);

  // mark the current question as visited
  useEffect(() => {
    if (!user) return;
    setVisited((prev) => {
      if (prev.has(current)) return prev;
      const next = new Set(prev);
      next.add(current);
      return next;
    });
  }, [current, user]);

  // On a long paper the palette scrolls inside its card; keep the current
  // question's button in view there without scrolling the page itself.
  useEffect(() => {
    const box = paletteRef.current;
    const btn = box?.querySelector("[aria-current='true']");
    if (!box || !btn || box.scrollHeight <= box.clientHeight) return;
    const top = btn.offsetTop;
    const bottom = top + btn.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = top - 8;
    else if (bottom > box.scrollTop + box.clientHeight) {
      box.scrollTop = bottom - box.clientHeight + 8;
    }
  }, [current]);

  // Keep the attempt in this browser so a reload, a dropped connection or a
  // closed tab does not cost the candidate the paper.
  useEffect(() => {
    if (!user || submitted || !paperHref || resumeOffer) return;
    saveAttempt(paperHref, {
      answers,
      current,
      seconds,
      mode,
      marked: [...marked],
      visited: [...visited],
      answered: Object.keys(answers).length,
      total,
      title: `${meta.subjectName} · ${T.mockShort(mockNum)}`,
      examId: meta.examId || null,
    });
  }, [
    answers, current, seconds, mode, marked, visited, user, submitted,
    paperHref, resumeOffer, total, meta.subjectName, meta.examId, mockNum, T,
  ]);

  const results = useMemo(() => {
    if (!submitted) return null;
    let correct = 0, wrong = 0, skipped = 0;
    questions.forEach((q, i) => {
      const a = answers[i];
      if (!a) skipped++;
      else if (a === q.correct) correct++;
      else wrong++;
    });
    return { correct, wrong, skipped, total };
  }, [submitted, questions, answers, total]);

  const changeLang = (l) => {
    setLang(l);
    try {
      localStorage.setItem("quizLang", l);
    } catch {}
  };

  const saveUser = () => {
    if (account) {
      setUser({ name: account.name, email: account.email || "" });
      return;
    }
    const name = nameInput.trim();
    if (!name) return;
    const u = { name, email: emailInput.trim() };
    try {
      localStorage.setItem("quizUser", JSON.stringify(u));
    } catch {}
    setUser(u);
  };

  const changeUser = () => {
    try {
      localStorage.removeItem("quizUser");
    } catch {}
    setNameInput(user?.name || "");
    setEmailInput(user?.email || "");
    setUser(null);
  };

  const acceptResume = () => {
    const s = resumeOffer;
    setAnswers(s.answers || {});
    setCurrent(Math.min(s.current || 0, total - 1));
    setSeconds(s.seconds || 0);
    setMode(s.mode === "practice" ? "practice" : "exam");
    setMarked(new Set(s.marked || []));
    setVisited(new Set(s.visited || []));
    setResumeOffer(null);
  };

  const declineResume = () => {
    clearAttempt(paperHref);
    setResumeOffer(null);
  };

  // ---------- LANGUAGE TOGGLE (shared) ----------
  // Plain render-functions (not nested components) so controlled inputs keep
  // focus across re-renders.
  const renderLangToggle = () => (
    <div className="lang-toggle">
      <span className="seg-label">{T.language}</span>
      <div className="seg" role="group" aria-label={T.languageAria}>
        <button
          className={lang === "en" ? "active" : ""}
          onClick={() => changeLang("en")}
        >
          EN
        </button>
        <button
          className={lang === "hi" ? "active" : ""}
          onClick={() => changeLang("hi")}
        >
          हिं
        </button>
        <button
          className={lang === "both" ? "active" : ""}
          onClick={() => changeLang("both")}
        >
          {T.both}
        </button>
      </div>
    </div>
  );

  const examBadge = meta.examLogo ? (
    <span className="quiz-exam">
      <span className="exam-logo" style={{ "--logo-size": "34px" }}>
        <img src={meta.examLogo} alt="" />
      </span>
      <span className="quiz-exam-name">{meta.examName}</span>
    </span>
  ) : null;

  // ---------- NAME + MODE GATE ----------
  if (!user) {
    keysRef.current = { enabled: false };
    return (
      <div className="gate" data-exam={meta.examId}>
        <a className="back-btn" href={meta.base}>
          ← {T.mockPapers}
        </a>

        <div className="gate-head">
          {examBadge}
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>
              {T.beforeBegin}
            </h1>
            <p className="page-sub" style={{ marginBottom: 0 }}>
              {T.gateSub(meta.subjectName, mockNum, total)}
            </p>
          </div>
        </div>

        <div className="q-card gate-card">
          {examSections.length > 1 ? (
            <>
              <div className="muted-sm" style={{ marginBottom: 8 }}>
                {T.gateSections(examSections.length, total)}
              </div>
              <div className="gate-sections">
                {examSections.map((s) => (
                  <span className="tag" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="muted-sm" style={{ marginBottom: 8 }}>
                {T.gateScored(total)}
              </div>
              <span className="tag">{meta.subjectName}</span>
            </>
          )}
        </div>

        <form
          className="q-card gate-card"
          onSubmit={(e) => {
            e.preventDefault();
            saveUser();
          }}
        >
          <label className="field-label">{T.chooseMode}</label>
          <div className="mode-grid">
            <button
              type="button"
              className={`mode-card ${mode === "exam" ? "active" : ""}`}
              onClick={() => setMode("exam")}
            >
              <h4>{T.examMode}</h4>
              <p>{T.examModeDesc(total)}</p>
            </button>
            <button
              type="button"
              className={`mode-card ${mode === "practice" ? "active" : ""}`}
              onClick={() => setMode("practice")}
            >
              <h4>{T.practiceMode}</h4>
              <p>{T.practiceModeDesc}</p>
            </button>
          </div>

          {account ? (
            <p className="gate-account">
              {T.signedInAs} <b>{account.name}</b>
            </p>
          ) : (
            <>
              <label className="field-label">{T.yourName}</label>
              <input
                className="text-input"
                value={nameInput}
                autoFocus
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={T.namePlaceholder}
              />
              <label className="field-label" style={{ marginTop: 12 }}>
                {T.emailOptional}
              </label>
              <input
                className="text-input"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
              />
              <p className="muted-sm" style={{ marginTop: 10 }}>
                <a className="gate-signin" href={`/signin?callbackUrl=${encodeURIComponent(meta.base + "/" + mockNum)}`}>
                  {T.signIn}
                </a>{" "}
                · {T.authSub}
              </p>
            </>
          )}

          <div style={{ marginTop: 16 }}>{renderLangToggle()}</div>

          <button
            className="btn"
            type="submit"
            disabled={!account && !nameInput.trim()}
            style={{ marginTop: 16, width: "100%" }}
          >
            {mode === "exam" ? T.startTest : T.startPractice}
          </button>
          <p className="muted-sm" style={{ marginTop: 10, textAlign: "center" }}>
            {T.autoSaved}
          </p>
        </form>
      </div>
    );
  }

  const practiceLocked = (idx) => mode === "practice" && answers[idx] != null;

  const select = (idx, letter) => {
    if (practiceLocked(idx)) return; // can't change after revealing in practice
    setAnswers((prev) => ({ ...prev, [idx]: letter }));
  };

  const clearResponse = () =>
    setAnswers((prev) => {
      if (prev[current] == null) return prev;
      const next = { ...prev };
      delete next[current];
      return next;
    });

  const toggleMark = (idx) =>
    setMarked((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  const goTo = (i) => setCurrent(Math.max(0, Math.min(total - 1, i)));
  const nextQuestion = () => goTo(current + 1);
  const markAndNext = () => {
    toggleMark(current);
    if (current < total - 1) nextQuestion();
  };

  // ---------- SUBMIT ----------
  const finalize = async (isAuto) => {
    if (submitted) return;
    let correct = 0, wrong = 0, skipped = 0;
    questions.forEach((qq, i) => {
      const a = answers[i];
      if (!a) skipped++;
      else if (a === qq.correct) correct++;
      else wrong++;
    });
    const percentage = Math.round((correct / total) * 100);

    setSubmitted(true);
    setConfirmingSubmit(false);
    if (isAuto) setAutoSubmitted(true);
    window.scrollTo(0, 0);

    // The paper is done: drop the running attempt and keep the score instead.
    if (paperHref) {
      clearAttempt(paperHref);
      recordResult({
        href: paperHref,
        title: `${meta.subjectName} · ${T.mockShort(mockNum)}`,
        examId: meta.examId || null,
        pct: percentage,
        passMark,
        correct,
        total,
      });
    }

    setSaveState("saving");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          sectionId: submitMeta.sectionId,
          sectionName: submitMeta.sectionName ?? meta.sectionName,
          groupId: submitMeta.groupId,
          groupName: submitMeta.groupName ?? meta.groupName,
          subjectId: submitMeta.subjectId,
          subjectName: submitMeta.subjectName ?? meta.subjectName,
          mock: mockNum,
          total,
          correct,
          wrong,
          skipped,
          percentage,
          duration: seconds,
          answers,
        }),
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  };
  autoSubmitRef.current = () => finalize(true);

  const handleSubmit = () => setConfirmingSubmit(true);

  const goBack = () => {
    if (!submitted && answeredCount > 0 && !window.confirm(T.confirmLeave)) return;
    window.location.href = meta.base;
  };

  // ---------- REPORT ----------
  const openReport = (index) =>
    setReport({ index, reason: REPORT_REASONS[0], note: "", state: "idle" });
  const closeReport = () => setReport(null);
  const submitReport = async () => {
    if (!report) return;
    setReport((r) => ({ ...r, state: "saving" }));
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: submitMeta.sectionId,
          sectionName: submitMeta.sectionName ?? meta.sectionName,
          subjectId: submitMeta.subjectId,
          subjectName: submitMeta.subjectName ?? meta.subjectName,
          mock: mockNum,
          questionIndex: report.index,
          questionText: questions[report.index]?.question,
          reason: report.reason,
          note: report.note,
          name: user.name,
          email: user.email,
        }),
      });
      setReport((r) => ({ ...r, state: res.ok ? "done" : "error" }));
    } catch {
      setReport((r) => ({ ...r, state: "error" }));
    }
  };

  const renderReportModal = () => {
    if (!report) return null;
    return (
      <div className="modal-backdrop" onClick={closeReport}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>{T.reportTitle(report.index + 1)}</h3>
          <p className="muted-sm" style={{ margin: 0 }}>
            {T.reportSub}
          </p>
          {report.state === "done" ? (
            <>
              <div className="feedback correct" style={{ marginTop: 16 }}>
                {T.reportThanks}
              </div>
              <div className="modal-actions">
                <button className="btn" onClick={closeReport}>
                  {T.close}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="reasons">
                {REPORT_REASONS.map((r, ri) => (
                  <label
                    key={r}
                    className={`reason-opt ${report.reason === r ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      checked={report.reason === r}
                      onChange={() => setReport((p) => ({ ...p, reason: r }))}
                    />
                    {T.reportReasons[ri]}
                  </label>
                ))}
              </div>
              <textarea
                className="text-input"
                rows={3}
                placeholder={T.reportNotePlaceholder}
                value={report.note}
                onChange={(e) => setReport((p) => ({ ...p, note: e.target.value }))}
              />
              {report.state === "error" && (
                <p className="muted-sm" style={{ color: "var(--red)" }}>
                  {T.reportError}
                </p>
              )}
              <div className="modal-actions">
                <button className="btn ghost" onClick={closeReport}>
                  {T.cancel}
                </button>
                <button
                  className="btn"
                  onClick={submitReport}
                  disabled={report.state === "saving"}
                >
                  {report.state === "saving" ? T.sending : T.reportSend}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ---------- SUBMIT SUMMARY ----------
  // The CBT's last screen before the paper locks: what is answered and what is
  // not, section by section on a full mock.
  const renderSubmitModal = () => {
    if (!confirmingSubmit) return null;
    const rows = (examSections.length > 1 ? examSections : [null]).map((name) => {
      const idx = [];
      questions.forEach((qq, i) => {
        if (name === null || qq.sectionName === name) idx.push(i);
      });
      return {
        name: name ?? meta.subjectName,
        answered: idx.filter((i) => answers[i] != null).length,
        notAnswered: idx.filter((i) => visited.has(i) && answers[i] == null).length,
        marked: idx.filter((i) => marked.has(i)).length,
        notVisited: idx.filter((i) => !visited.has(i)).length,
      };
    });
    const unanswered = total - answeredCount;
    const left = Math.max(0, total * SECONDS_PER_Q - seconds);
    const close = () => setConfirmingSubmit(false);

    return (
      <div className="modal-backdrop" onClick={close}>
        <div
          className="modal modal-wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="submit-title">{T.submitTitle}</h3>
          <p className="muted-sm" style={{ margin: 0 }}>
            {mode === "exam"
              ? T.submitTimeLeft(fmtTime(left))
              : T.submitTimeTaken(fmtTime(seconds))}
          </p>
          <div className="table-wrap submit-table">
            <table className="table">
              <thead>
                <tr>
                  <th>{T.sectionCol}</th>
                  <th>{T.summaryAnswered}</th>
                  <th>{T.summaryNotAnswered}</th>
                  <th>{T.summaryMarked}</th>
                  <th>{T.summaryNotVisited}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td className="n-answered">{r.answered}</td>
                    <td className={r.notAnswered ? "n-not" : ""}>{r.notAnswered}</td>
                    <td>{r.marked}</td>
                    <td>{r.notVisited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`submit-note ${unanswered ? "" : "ok"}`}>
            {unanswered ? T.submitUnanswered(unanswered) : T.submitAllAnswered}
          </div>
          <div className="modal-actions">
            <button className="btn ghost" onClick={close} autoFocus>
              {T.backToPaper}
            </button>
            <button className="btn" onClick={() => finalize(false)}>
              {T.submitFinal}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ---------- REPORT CARD ----------
  if (submitted && results) {
    keysRef.current = { enabled: false, escape: report ? closeReport : null };
    const pct = Math.round((results.correct / results.total) * 100);
    const attempted = results.correct + results.wrong;
    const accuracy = attempted ? Math.round((results.correct / attempted) * 100) : 0;
    const pace = results.total ? seconds / results.total : 0;
    const passed = passMark != null && pct >= passMark;

    // Where a candidate goes next: straight on to the following paper, the
    // same one again, or back to the list. A full mock keeps its ?lang/stream.
    const query = paperHref.includes("?") ? paperHref.slice(paperHref.indexOf("?")) : "";
    const nextHref =
      meta.mockCount && mockNum < meta.mockCount
        ? `${meta.base}/${mockNum + 1}${query}`
        : null;
    const renderFinishActions = () => (
      <div className="center-actions">
        {nextHref && (
          <a className="btn" href={nextHref}>
            {T.nextMock(mockNum + 1)}
          </a>
        )}
        <a className="btn ghost" href={paperHref || meta.base}>
          {T.retakePaper}
        </a>
        <a className={nextHref ? "btn ghost" : "btn"} href={meta.base}>
          {T.otherMocks}
        </a>
      </div>
    );

    // A full mock runs several sections; showing where the marks were lost is
    // the whole point of sitting one.
    const bySection =
      examSections.length > 1
        ? examSections.map((name) => {
            const idx = questions
              .map((q, i) => (q.sectionName === name ? i : -1))
              .filter((i) => i >= 0);
            let correct = 0, wrong = 0, skipped = 0;
            for (const i of idx) {
              const a = answers[i];
              if (!a) skipped++;
              else if (a === questions[i].correct) correct++;
              else wrong++;
            }
            return {
              name,
              correct,
              wrong,
              skipped,
              total: idx.length,
              pct: idx.length ? Math.round((correct / idx.length) * 100) : 0,
            };
          })
        : [];

    const shown = questions
      .map((q, i) => ({ q, i }))
      .filter(({ q, i }) => (reviewFilter === "all" ? true : answers[i] !== q.correct));

    return (
      <div data-exam={meta.examId}>
        <button className="back-btn" onClick={goBack}>
          ← {T.mockPapers}
        </button>

        <div className="gate-head">
          {examBadge}
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>
              {T.reportCard}
            </h1>
            <p className="page-sub" style={{ marginBottom: 0 }}>
              {user.name} · {meta.subjectName} · {T.mockPaper(mockNum)} ·{" "}
              {T.timeTaken} {fmtTime(seconds)}
              {autoSubmitted && T.autoSubmitted}
              {saveState === "saving" && T.saving}
              {saveState === "saved" && T.saved}
              {saveState === "error" && T.saveFailed}
            </p>
          </div>
        </div>

        <div className={`scorebox ${passed ? "passed" : ""}`}>
          <div className="score-ring" aria-hidden="true">
            <svg viewBox="0 0 120 120">
              <circle className="ring-track" cx="60" cy="60" r="52" />
              {/* A zero-length stroke still draws its round cap as a dot. */}
              {pct > 0 && (
                <circle
                  className="ring-fill"
                  cx="60"
                  cy="60"
                  r="52"
                  style={{ strokeDasharray: `${(pct / 100) * 327} 327` }}
                />
              )}
            </svg>
            <div className="score-ring-text">
              <span className="score-num">{pct}%</span>
              <span className="score-of">
                {results.correct}/{results.total}
              </span>
            </div>
          </div>

          {passMark != null && (
            <div className="score-verdict">
              <span className={`verdict-pill ${passed ? "pass" : "fail"}`}>
                {passed ? T.qualified(passMark) : T.notQualified(pct, passMark)}
              </span>
            </div>
          )}

          <div className="stat-row">
            <div className="stat correct">
              <div className="n">{results.correct}</div>
              <div className="l">{T.correct}</div>
            </div>
            <div className="stat wrong">
              <div className="n">{results.wrong}</div>
              <div className="l">{T.wrong}</div>
            </div>
            <div className="stat skipped">
              <div className="n">{results.skipped}</div>
              <div className="l">{T.unattempted}</div>
            </div>
            <div className="stat neutral">
              <div className="n">{accuracy}%</div>
              <div className="l">{T.accuracy}</div>
            </div>
            <div className="stat neutral">
              <div className="n">{fmtPace(pace)}</div>
              <div className="l">{T.perQuestion}</div>
            </div>
          </div>
        </div>

        {bySection.length > 0 && (
          <>
            <h2 className="strip-title">{T.sectionBreakdown}</h2>
            <div className="section-breakdown">
              {bySection.map((s) => (
                <div className="breakdown-row" key={s.name}>
                  <div className="breakdown-name">{s.name}</div>
                  <div className="breakdown-bar" aria-hidden="true">
                    <span
                      className="bd-correct"
                      style={{ width: `${(s.correct / s.total) * 100}%` }}
                    />
                    <span
                      className="bd-wrong"
                      style={{ width: `${(s.wrong / s.total) * 100}%` }}
                    />
                  </div>
                  <div className="breakdown-score">
                    {s.correct}/{s.total}
                    <span className="breakdown-pct">{s.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {renderFinishActions()}

        <div className="review-head">
          <h2 className="page-title" style={{ fontSize: 20, marginBottom: 0 }}>
            {T.review}
          </h2>
          <div className="review-tools">
            <div className="seg" role="group">
              <button
                className={reviewFilter === "all" ? "active" : ""}
                onClick={() => setReviewFilter("all")}
              >
                {T.reviewAll}
              </button>
              <button
                className={reviewFilter === "wrong" ? "active" : ""}
                onClick={() => setReviewFilter("wrong")}
              >
                {T.reviewWrongOnly}
              </button>
            </div>
            {renderLangToggle()}
          </div>
        </div>

        {!shown.length && <p className="page-sub">{T.nothingToReview}</p>}

        {shown.map(({ q, i }) => {
          const a = answers[i];
          const state = !a ? "skipped" : a === q.correct ? "correct" : "wrong";
          return (
            <div className="review-q" key={i}>
              <div className="review-q-head">
                <span className="q-num">{i + 1}</span>
                <div className="review-q-tools">
                  <span className={`tag ${state}`}>
                    {state === "correct"
                      ? T.correct
                      : state === "wrong"
                      ? T.wrong
                      : T.skipped}
                  </span>
                  <button className="tool-btn report" onClick={() => openReport(i)}>
                    {T.report}
                  </button>
                </div>
              </div>
              {q.sectionLabel && (
                <div style={{ marginBottom: 8 }}>
                  <span className="tag">{q.sectionLabel}</span>
                </div>
              )}
              <div className="q-text">{tr(q.question)}</div>
              <QuestionFigure image={q.image} alt={T.figure} />
              <div className="options" style={{ marginTop: 12 }}>
                {LETTERS.filter((L) => q.options[L]).map((L) => {
                  let cls = "option";
                  if (L === q.correct) cls += " correct";
                  else if (L === a) cls += " wrong";
                  let keyCls = "key";
                  if (L === q.correct) keyCls += " correct";
                  else if (L === a) keyCls += " wrong";
                  return (
                    <div className={cls} key={L}>
                      <span className={keyCls}>{L}</span>
                      <span className="otext">{tr(q.options[L])}</span>
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <div className="explain">
                  <b>{T.explanation}</b> {tr(q.explanation)}
                </div>
              )}
            </div>
          );
        })}

        {renderFinishActions()}
        {renderReportModal()}
      </div>
    );
  }

  // ---------- THE PAPER ----------
  const q = questions[current];
  const revealed = practiceLocked(current); // practice: answer locked & shown
  const budget = total * SECONDS_PER_Q;
  const remaining = Math.max(0, budget - seconds);
  const timed = mode === "exam";
  const optionLetters = LETTERS.filter((L) => q.options[L]);

  // Wire the keyboard to whatever the screen is showing right now.
  keysRef.current = {
    enabled: !resumeOffer && !confirmingSubmit && !report,
    escape: confirmingSubmit
      ? () => setConfirmingSubmit(false)
      : report
      ? closeReport
      : null,
    choose: (i) => optionLetters[i] && select(current, optionLetters[i]),
    next: nextQuestion,
    prev: () => goTo(current - 1),
    mark: () => toggleMark(current),
  };

  const notAnswered = [...visited].filter((i) => answers[i] == null).length;
  const notVisited = total - visited.size;

  // A full mock's palette is split by section, the way the CBT tabs it.
  const paletteGroups =
    examSections.length > 1
      ? examSections.map((name) => ({
          name,
          idx: questions
            .map((qq, i) => (qq.sectionName === name ? i : -1))
            .filter((i) => i >= 0),
        }))
      : [{ name: null, idx: questions.map((_, i) => i) }];

  const paletteClass = (i) => {
    const answered = answers[i] != null;
    const mk = marked.has(i);
    const c = [];
    if (mk) c.push("marked");
    if (answered) c.push("answered");
    else if (!mk && visited.has(i)) c.push("seen");
    if (i === current) c.push("current");
    return c.join(" ");
  };

  // Coming back to a paper that was left half-written.
  if (resumeOffer) {
    return (
      <div className="gate" data-exam={meta.examId}>
        <a className="back-btn" href={meta.base}>
          ← {T.mockPapers}
        </a>
        <div className="q-card gate-card">
          <h1 className="page-title" style={{ marginBottom: 6 }}>
            {T.resumeTitle}
          </h1>
          <p className="page-sub" style={{ marginBottom: 18 }}>
            {T.resumeBody(resumeOffer.answered, resumeOffer.total)}
          </p>
          <div className="resume-choice">
            <button className="btn" onClick={acceptResume}>
              {T.resumeContinue}
            </button>
            <button className="btn ghost" onClick={declineResume}>
              {T.resumeRestart}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cbt" data-exam={meta.examId}>
      <div className="cbt-topbar">
        <button className="back-btn" onClick={goBack} style={{ marginBottom: 0 }}>
          ← {T.mockPapers}
        </button>
        <div className="breadcrumb" style={{ marginBottom: 0 }}>
          <a href="/">{T.home}</a>
          {meta.examBase && (
            <>
              <span className="sep">›</span>
              <a href={meta.examBase}>{meta.examName}</a>
            </>
          )}
          <span className="sep">›</span>
          <a href={meta.sectionBase}>{meta.sectionName}</a>
          {meta.multiGroup && (
            <>
              <span className="sep">›</span>
              <a href={meta.groupBase}>{meta.groupName}</a>
            </>
          )}
          <span className="sep">›</span>
          <a href={meta.base}>{meta.subjectName}</a>
        </div>
      </div>

      <div className="cbt-bar">
        <div className="cbt-bar-id">
          {examBadge}
          <div className="cbt-paper">
            <strong>{meta.subjectName}</strong>
            <span className="muted-sm">
              {T.mockShort(mockNum)} · {T.questionCount(total)}
            </span>
          </div>
          <span className="mode-badge">
            {mode === "exam" ? T.examBadge : T.practiceBadge}
          </span>
        </div>
        <div className="cbt-bar-tools">
          {renderLangToggle()}
          <span
            className={`timer ${
              !timed ? "" : remaining <= 60 ? "danger" : remaining <= WARN_SECONDS ? "warn" : ""
            }`}
            title={timed ? T.timeLeft : T.timeTaken}
          >
            ⏱ {fmtTime(timed ? remaining : seconds)}
          </span>
          <button className="btn btn-sm success" onClick={handleSubmit}>
            {T.submitTest}
          </button>
        </div>
      </div>

      <div className="progress">
        <div
          className="progress-fill"
          style={{ width: `${(answeredCount / total) * 100}%` }}
        />
      </div>

      <div className="cbt-body">
        <main className="cbt-main">
          <div className="q-card">
            <div className="q-head">
              <span className="q-num">{T.questionOf(current + 1, total)}</span>
              <div className="q-tools">
                <button
                  className={`tool-btn ${marked.has(current) ? "marked" : ""}`}
                  onClick={() => toggleMark(current)}
                >
                  {marked.has(current) ? T.marked : T.markForReview}
                </button>
                <button
                  className="tool-btn report"
                  onClick={() => openReport(current)}
                >
                  {T.report}
                </button>
              </div>
            </div>

            {q.sectionLabel && (
              <div style={{ marginBottom: 10 }}>
                <span className="tag">{q.sectionLabel}</span>
              </div>
            )}

            <div className="q-text">{tr(q.question)}</div>
            <QuestionFigure image={q.image} alt={T.figure} />

            <div className="options" key={current}>
              {optionLetters.map((L, idx) => {
                const chosen = answers[current] === L;
                let cls = "option";
                if (revealed) {
                  if (L === q.correct) cls += " correct";
                  else if (chosen) cls += " wrong";
                } else if (chosen) {
                  cls += " selected";
                }
                return (
                  <button
                    key={L}
                    className={cls}
                    style={{ "--i": idx }}
                    onClick={() => select(current, L)}
                    disabled={revealed}
                    aria-pressed={chosen}
                  >
                    <span className="radio" aria-hidden="true" />
                    <span className="okey" aria-hidden="true">
                      {L}
                    </span>
                    <span className="otext">{tr(q.options[L])}</span>
                  </button>
                );
              })}
            </div>

            {revealed && (
              <>
                <div
                  className={`feedback ${
                    answers[current] === q.correct ? "correct" : "wrong"
                  }`}
                >
                  {answers[current] === q.correct
                    ? T.correctFeedback
                    : T.wrongFeedback(q.correct)}
                </div>
                {q.explanation && (
                  <div className="explain">
                    <b>{T.explanation}</b> {tr(q.explanation)}
                  </div>
                )}
              </>
            )}

            {/* The controls the real CBT gives you, in the real CBT's order. */}
            <div className="cbt-actions">
              <div className="cbt-actions-left">
                <button
                  className="btn ghost btn-sm"
                  onClick={clearResponse}
                  disabled={answers[current] == null || revealed}
                >
                  {T.clearResponse}
                </button>
                <button className="btn ghost btn-sm" onClick={markAndNext}>
                  {T.markAndNext}
                </button>
              </div>
              <div className="cbt-actions-right">
                <button
                  className="btn ghost btn-sm"
                  disabled={current === 0}
                  onClick={() => goTo(current - 1)}
                >
                  {T.previous}
                </button>
                {current < total - 1 ? (
                  <button className="btn btn-sm" onClick={nextQuestion}>
                    {T.saveAndNext}
                  </button>
                ) : (
                  <button className="btn btn-sm success" onClick={handleSubmit}>
                    {T.submitTest}
                  </button>
                )}
              </div>
            </div>
            <p className="shortcut-hint">{T.shortcutsHint}</p>
          </div>
        </main>

        <aside className="cbt-side">
          <div className="side-card candidate-card">
            <div className="candidate-label">{T.candidateLabel}</div>
            <div className="candidate-name">{user.name}</div>
            <button className="linklike" onClick={changeUser}>
              {T.changeUser}
            </button>
          </div>

          <div className="side-card">
            <div className="side-title">{T.paletteTitle}</div>
            <div className="side-counts">
              <span className="count-chip answered">
                <b>{answeredCount}</b> {T.summaryAnswered}
              </span>
              <span className="count-chip seen">
                <b>{notAnswered}</b> {T.summaryNotAnswered}
              </span>
              <span className="count-chip marked">
                <b>{marked.size}</b> {T.summaryMarked}
              </span>
              <span className="count-chip notvisited">
                <b>{notVisited}</b> {T.summaryNotVisited}
              </span>
            </div>

            <div
              ref={paletteRef}
              className={`palette-scroll ${total > 40 ? "is-long" : ""}`}
            >
              {paletteGroups.map((g) => (
                <div key={g.name || "all"}>
                  {g.name && <div className="palette-section">{g.name}</div>}
                  <div className="palette">
                    {g.idx.map((i) => (
                      <button
                        key={i}
                        className={paletteClass(i)}
                        onClick={() => goTo(i)}
                        aria-label={`${T.qShort} ${i + 1}`}
                        aria-current={i === current ? "true" : undefined}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="palette-legend">
              <span>
                <i className="lg-swatch notvisited" /> {T.legendNotVisited}
              </span>
              <span>
                <i className="lg-swatch seen" /> {T.legendNotAnswered}
              </span>
              <span>
                <i className="lg-swatch answered" /> {T.legendAnswered}
              </span>
              <span>
                <i className="lg-swatch marked" /> {T.legendMarked}
              </span>
            </div>

            <button
              className="btn success"
              onClick={handleSubmit}
              style={{ width: "100%", marginTop: 16 }}
            >
              {T.submitTest}
            </button>
            <p className="muted-sm" style={{ marginTop: 10, textAlign: "center" }}>
              {T.autoSaved}
            </p>
          </div>
        </aside>
      </div>

      {renderReportModal()}
      {renderSubmitModal()}
    </div>
  );
}
