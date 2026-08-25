"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pickLang } from "@/lib/lang";
import { uiText } from "@/lib/ui-text";

const LETTERS = ["A", "B", "C", "D"];
const SECONDS_PER_Q = 60; // exam mode: 1 minute per question (TET ratio)
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

/**
 * The quiz screen, shared by every exam.
 *
 * @param questions  loaded on the server; each may carry sectionLabel/sectionName
 * @param meta       display names + the hrefs used by breadcrumbs and Back
 * @param submitMeta ids stored with the result and with question reports
 */
export default function QuizRunner({ questions, meta, submitMeta, mockNum }) {
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
  const [lang, setLang] = useState("both"); // both | en | hi
  const [marked, setMarked] = useState(() => new Set());
  const [visited, setVisited] = useState(() => new Set());

  const [report, setReport] = useState(null); // { index, reason, note, state }

  const autoSubmitRef = useRef(null);

  const tr = (t) => pickLang(t, lang);
  // Copy for the screen itself; a Hindi-reading bank passes uiLang: "hi".
  const T = uiText(meta.uiLang);

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
    try {
      const u = JSON.parse(localStorage.getItem("quizUser") || "null");
      if (u && u.name) setUser(u);
      const l = localStorage.getItem("quizLang");
      if (l === "en" || l === "hi" || l === "both") setLang(l);
    } catch {}
  }, []);

  // timer: runs once identified, until submitted (counts elapsed)
  useEffect(() => {
    if (submitted || !user) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [submitted, user]);

  // exam mode: auto-submit when time runs out
  useEffect(() => {
    if (mode !== "exam" || submitted || !user) return;
    if (seconds >= questions.length * SECONDS_PER_Q && autoSubmitRef.current) {
      autoSubmitRef.current();
    }
  }, [seconds, mode, submitted, questions, user]);

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

  const results = useMemo(() => {
    if (!submitted) return null;
    let correct = 0,
      wrong = 0,
      skipped = 0;
    questions.forEach((q, i) => {
      const a = answers[i];
      if (!a) skipped++;
      else if (a === q.correct) correct++;
      else wrong++;
    });
    return { correct, wrong, skipped, total: questions.length };
  }, [submitted, questions, answers]);

  const changeLang = (l) => {
    setLang(l);
    try {
      localStorage.setItem("quizLang", l);
    } catch {}
  };

  const saveUser = () => {
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

  // ---------- LANGUAGE TOGGLE (shared) ----------
  // Plain render-functions (not nested components) so controlled inputs keep
  // focus across re-renders.
  const renderLangToggle = () => (
    <div style={{ display: "inline-flex", alignItems: "center" }}>
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

  // ---------- NAME + MODE GATE ----------
  if (!user) {
    return (
      <div style={{ maxWidth: 460, margin: "20px auto" }}>
        <a className="back-btn" href={meta.base}>
          ← {T.mockPapers}
        </a>
        <h1 className="page-title">{T.beforeBegin}</h1>
        <p className="page-sub">
          {T.gateSub(meta.subjectName, mockNum, questions.length)}
        </p>
        <div className="q-card" style={{ marginTop: 12 }}>
          {examSections.length > 1 ? (
            <>
              <div className="muted-sm" style={{ marginBottom: 8 }}>
                {T.gateSections(examSections.length, questions.length)}
              </div>
              <div className="tag mandatory">{examSections.join(" → ")}</div>
            </>
          ) : (
            <>
              <div className="muted-sm" style={{ marginBottom: 8 }}>
                {T.gateScored(questions.length)}
              </div>
              <div className="tag mandatory">{meta.subjectName}</div>
            </>
          )}
        </div>
        <form
          className="q-card"
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
              <p>{T.examModeDesc(questions.length)}</p>
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

          <div style={{ marginTop: 16 }}>{renderLangToggle()}</div>

          <button
            className="btn"
            type="submit"
            disabled={!nameInput.trim()}
            style={{ marginTop: 16, width: "100%" }}
          >
            {mode === "exam" ? T.startTest : T.startPractice}
          </button>
        </form>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const practiceLocked = (idx) => mode === "practice" && answers[idx] != null;

  const select = (idx, letter) => {
    if (practiceLocked(idx)) return; // can't change after revealing in practice
    setAnswers((prev) => ({ ...prev, [idx]: letter }));
  };

  const toggleMark = (idx) =>
    setMarked((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  // ---------- SUBMIT ----------
  const finalize = async (isAuto) => {
    if (submitted) return;
    let correct = 0,
      wrong = 0,
      skipped = 0;
    questions.forEach((qq, i) => {
      const a = answers[i];
      if (!a) skipped++;
      else if (a === qq.correct) correct++;
      else wrong++;
    });
    const percentage = Math.round((correct / questions.length) * 100);

    setSubmitted(true);
    if (isAuto) setAutoSubmitted(true);
    window.scrollTo(0, 0);

    setSaveState("saving");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          sectionId: submitMeta.sectionId,
          sectionName: meta.sectionName,
          groupId: submitMeta.groupId,
          groupName: meta.groupName,
          subjectId: submitMeta.subjectId,
          subjectName: meta.subjectName,
          mock: mockNum,
          total: questions.length,
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

  const handleSubmit = () => {
    const unanswered = questions.length - answeredCount;
    const msg =
      unanswered > 0
        ? T.confirmUnanswered(unanswered)
        : T.confirmSubmit;
    if (!window.confirm(msg)) return;
    finalize(false);
  };

  const goBack = () => {
    if (
      !submitted &&
      answeredCount > 0 &&
      !window.confirm(T.confirmLeave)
    )
      return;
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
          sectionName: meta.sectionName,
          subjectId: submitMeta.subjectId,
          subjectName: meta.subjectName,
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
                    className={`reason-opt ${
                      report.reason === r ? "active" : ""
                    }`}
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
                onChange={(e) =>
                  setReport((p) => ({ ...p, note: e.target.value }))
                }
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

  // ---------- REPORT CARD ----------
  if (submitted && results) {
    const pct = Math.round((results.correct / results.total) * 100);
    return (
      <div>
        <button className="back-btn" onClick={goBack}>
          ← {T.mockPapers}
        </button>
        <h1 className="page-title">{T.reportCard}</h1>
        <p className="page-sub">
          {user.name} · {meta.subjectName} · {T.mockPaper(mockNum)} ·{" "}
          {T.timeLabel} {fmtTime(seconds)}
          {autoSubmitted && T.autoSubmitted}
          {saveState === "saving" && T.saving}
          {saveState === "saved" && T.saved}
          {saveState === "error" && T.saveFailed}
        </p>

        <div className="scorebox">
          <div className="score-num">
            {results.correct}/{results.total}
          </div>
          <div className="score-pct">{T.pctCorrect(pct)}</div>
          <div className="stat-row">
            <div className="stat correct" style={{ "--i": 0 }}>
              <div className="n">{results.correct}</div>
              <div className="l">{T.correct}</div>
            </div>
            <div className="stat wrong" style={{ "--i": 1 }}>
              <div className="n">{results.wrong}</div>
              <div className="l">{T.wrong}</div>
            </div>
            <div className="stat skipped" style={{ "--i": 2 }}>
              <div className="n">{results.skipped}</div>
              <div className="l">{T.unattempted}</div>
            </div>
          </div>
        </div>

        <div className="center-actions">
          <a className="btn" href={meta.base}>
            {T.otherMocks}
          </a>
          <a className="btn ghost" href="/">
            {T.home}
          </a>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <h2 className="page-title" style={{ fontSize: 20, marginBottom: 0 }}>
            {T.review}
          </h2>
          {renderLangToggle()}
        </div>

        {questions.map((q, i) => {
          const a = answers[i];
          const state = !a ? "skipped" : a === q.correct ? "correct" : "wrong";
          return (
            <div className="review-q" key={i} style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span className="q-num">{i + 1}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className={`tag ${state}`}>
                    {state === "correct"
                      ? T.correct
                      : state === "wrong"
                      ? T.wrong
                      : T.skipped}
                  </span>
                  <button
                    className="tool-btn report"
                    onClick={() => openReport(i)}
                  >
                    {T.report}
                  </button>
                </div>
              </div>
              {q.sectionLabel && (
                <div style={{ marginBottom: 8 }}>
                  <span className="tag">{q.sectionLabel}</span>
                </div>
              )}
              <div className="q-text" style={{ fontWeight: 600 }}>
                {tr(q.question)}
              </div>
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

        <div className="center-actions">
          <a className="btn" href={meta.base}>
            {T.otherMocks}
          </a>
          <a className="btn ghost" href="/">
            {T.home}
          </a>
        </div>
        {renderReportModal()}
      </div>
    );
  }

  // ---------- QUIZ ----------
  const q = questions[current];
  const revealed = practiceLocked(current); // practice: answer locked & shown
  const total = questions.length * SECONDS_PER_Q;
  const remaining = Math.max(0, total - seconds);
  const timed = mode === "exam";

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

  return (
    <div>
      <button className="back-btn" onClick={goBack}>
        ← {T.mockPapers}
      </button>
      <div className="breadcrumb">
        <a href="/">{T.home}</a>
        {meta.examBase && (
          <>
            <span className="sep">/</span>
            <a href={meta.examBase}>{meta.examName}</a>
          </>
        )}
        <span className="sep">/</span>
        <a href={meta.sectionBase}>{meta.sectionName}</a>
        {meta.multiGroup && (
          <>
            <span className="sep">/</span>
            <a href={meta.groupBase}>{meta.groupName}</a>
          </>
        )}
        <span className="sep">/</span>
        <a href={meta.base}>{meta.subjectName}</a>
        <span className="sep">/</span>
        <span>{T.mockShort(mockNum)}</span>
      </div>

      <div className="quiz-bar">
        <div className="meta">
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span className="mode-badge">
              {mode === "exam" ? T.examBadge : T.practiceBadge}
            </span>
            {q?.sectionLabel && <span className="tag">{q.sectionLabel}</span>}
            <span>
              <strong>{meta.subjectName}</strong> · {T.mockShort(mockNum)} ·{" "}
              {T.qShort} <strong>{current + 1}</strong>/{questions.length} ·{" "}
              {T.answeredLabel} <strong>{answeredCount}</strong>
            </span>
          </div>
          <div className="muted-sm" style={{ marginTop: 4 }}>
            {user.name}{" "}
            <button className="linklike" onClick={changeUser}>
              {T.changeUser}
            </button>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {renderLangToggle()}
          <span className={`timer ${timed && remaining <= 60 ? "danger" : ""}`}>
            ⏱ {fmtTime(timed ? remaining : seconds)}
          </span>
          <button className="btn success" onClick={handleSubmit}>
            {T.submitTest}
          </button>
        </div>
      </div>

      <div className="progress">
        <div
          className="progress-fill"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="q-card">
        <div
          className="q-head"
          style={{ alignItems: "center", flexWrap: "wrap" }}
        >
          <span className="q-num">
            {T.questionOf(current + 1, questions.length)}
          </span>
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
        <div className="options" key={current}>
          {LETTERS.filter((L) => q.options[L]).map((L, idx) => {
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
              >
                <span className="radio" aria-hidden="true" />
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

        <div className="q-nav">
          <button
            className="btn ghost"
            disabled={current === 0}
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          >
            {T.previous}
          </button>
          {current < questions.length - 1 ? (
            <button
              className="btn"
              onClick={() =>
                setCurrent((c) => Math.min(questions.length - 1, c + 1))
              }
            >
              {T.next}
            </button>
          ) : (
            <button className="btn success" onClick={handleSubmit}>
              {T.submitTest}
            </button>
          )}
        </div>
      </div>

      <div className="palette">
        {questions.map((_, i) => (
          <button
            key={i}
            className={paletteClass(i)}
            onClick={() => setCurrent(i)}
          >
            {i + 1}
          </button>
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

      {renderReportModal()}
    </div>
  );
}
