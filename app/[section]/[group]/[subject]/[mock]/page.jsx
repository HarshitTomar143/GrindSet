"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { pickLang } from "@/lib/lang";

const LETTERS = ["A", "B", "C", "D"];
const SECONDS_PER_Q = 60; // exam mode: 1 minute per question (UPTET ratio)
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

export default function QuizPage() {
  const { section, group, subject, mock } = useParams();
  const mockNum = parseInt(mock, 10);

  const [meta, setMeta] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);

  const [answers, setAnswers] = useState({}); // idx -> letter
  const [current, setCurrent] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  const [user, setUser] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [saveState, setSaveState] = useState("idle");

  // new feature state
  const [mode, setMode] = useState("exam"); // exam | practice
  const [lang, setLang] = useState("both"); // both | en | hi
  const [marked, setMarked] = useState(() => new Set());
  const [visited, setVisited] = useState(() => new Set());

  const [report, setReport] = useState(null); // { index, reason, note, state }

  const autoSubmitRef = useRef(null);

  const tr = (t) => pickLang(t, lang);

  // remember the test-taker + language preference (browser-local)
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("quizUser") || "null");
      if (u && u.name) setUser(u);
      const l = localStorage.getItem("quizLang");
      if (l === "en" || l === "hi" || l === "both") setLang(l);
    } catch {}
  }, []);

  // Load manifest (for names) + the mock's questions from the API.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const man = await fetch("/api/manifest").then((r) => r.json());
        if (man.error) throw new Error(man.error);
        const sec = man.sections.find((s) => s.id === section);
        const grp = sec?.groups.find((g) => g.id === group);
        const subj = grp?.subjects.find((s) => s.id === subject);
        if (!subj) throw new Error("Subject not found");

        const res = await fetch(
          `/api/quiz?section=${section}&group=${group}&subject=${subject}&mock=${mockNum}`
        ).then((r) => r.json());
        if (res.error) throw new Error(res.error);
        if (!alive) return;
        setMeta({
          sectionName: sec.name,
          groupName: grp.name,
          subjectName: subj.name,
          multiGroup: sec.groups.length > 1,
          base: `/${section}/${group}/${subject}`,
          groupBase: `/${section}/${group}`,
          sectionBase: `/${section}`,
        });
        setQuestions(res.questions);
      } catch (e) {
        if (alive) setError(e.message || "Failed to load");
      }
    })();
    return () => {
      alive = false;
    };
  }, [section, group, subject, mockNum]);

  // timer: runs once identified, until submitted (counts elapsed)
  useEffect(() => {
    if (submitted || !questions || !user) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [submitted, questions, user]);

  // exam mode: auto-submit when time runs out
  useEffect(() => {
    if (mode !== "exam" || submitted || !questions || !user) return;
    if (seconds >= questions.length * SECONDS_PER_Q && autoSubmitRef.current) {
      autoSubmitRef.current();
    }
  }, [seconds, mode, submitted, questions, user]);

  // mark the current question as visited
  useEffect(() => {
    if (!questions || !user) return;
    setVisited((prev) => {
      if (prev.has(current)) return prev;
      const next = new Set(prev);
      next.add(current);
      return next;
    });
  }, [current, questions, user]);

  const results = useMemo(() => {
    if (!submitted || !questions) return null;
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

  if (error)
    return (
      <div className="loading">
        Could not load this paper: {error}. <a href="/">Go home</a>
      </div>
    );
  if (!questions || !meta) return <div className="loading">Loading paper…</div>;

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
      <span className="seg-label">Language</span>
      <div className="seg" role="group" aria-label="Question language">
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
          Both
        </button>
      </div>
    </div>
  );

  // ---------- NAME + MODE GATE ----------
  if (!user) {
    return (
      <div style={{ maxWidth: 460, margin: "20px auto" }}>
        <button
          className="back-btn"
          onClick={() => (window.location.href = meta.base)}
        >
          ← Mock papers
        </button>
        <h1 className="page-title">Before you begin</h1>
        <p className="page-sub">
          {meta.subjectName} · Mock Paper {mockNum} · {questions.length} questions
        </p>
        <form
          className="q-card"
          onSubmit={(e) => {
            e.preventDefault();
            saveUser();
          }}
        >
          <label className="field-label">Choose a mode</label>
          <div className="mode-grid">
            <button
              type="button"
              className={`mode-card ${mode === "exam" ? "active" : ""}`}
              onClick={() => setMode("exam")}
            >
              <h4>📝 Exam mode</h4>
              <p>
                {questions.length}-minute timer that auto-submits when time is
                up. Score &amp; review at the end — like the real CBT.
              </p>
            </button>
            <button
              type="button"
              className={`mode-card ${mode === "practice" ? "active" : ""}`}
              onClick={() => setMode("practice")}
            >
              <h4>📚 Practice mode</h4>
              <p>
                Untimed. See the correct answer and explanation right after each
                question.
              </p>
            </button>
          </div>

          <label className="field-label">Your name *</label>
          <input
            className="text-input"
            value={nameInput}
            autoFocus
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="e.g. Priya Sharma"
          />
          <label className="field-label" style={{ marginTop: 12 }}>
            Email (optional)
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
            {mode === "exam" ? "Start test →" : "Start practice →"}
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
          sectionId: section,
          sectionName: meta.sectionName,
          groupId: group,
          groupName: meta.groupName,
          subjectId: subject,
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
        ? `You have ${unanswered} unanswered question(s). Submit anyway?`
        : "Submit your answers?";
    if (!window.confirm(msg)) return;
    finalize(false);
  };

  const goBack = () => {
    if (
      !submitted &&
      answeredCount > 0 &&
      !window.confirm("Leave this test? Your answers will be lost.")
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
          sectionId: section,
          sectionName: meta.sectionName,
          subjectId: subject,
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
          <h3>Report question {report.index + 1}</h3>
          <p className="muted-sm" style={{ margin: 0 }}>
            Tell us what looks wrong — it goes to the admin for review.
          </p>
          {report.state === "done" ? (
            <>
              <div className="feedback correct" style={{ marginTop: 16 }}>
                ✓ Thanks! Your report was submitted.
              </div>
              <div className="modal-actions">
                <button className="btn" onClick={closeReport}>
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="reasons">
                {REPORT_REASONS.map((r) => (
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
                      onChange={() =>
                        setReport((p) => ({ ...p, reason: r }))
                      }
                    />
                    {r}
                  </label>
                ))}
              </div>
              <textarea
                className="text-input"
                rows={3}
                placeholder="Add details (optional)…"
                value={report.note}
                onChange={(e) =>
                  setReport((p) => ({ ...p, note: e.target.value }))
                }
              />
              {report.state === "error" && (
                <p className="muted-sm" style={{ color: "var(--red)" }}>
                  Could not submit — please try again.
                </p>
              )}
              <div className="modal-actions">
                <button className="btn ghost" onClick={closeReport}>
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={submitReport}
                  disabled={report.state === "saving"}
                >
                  {report.state === "saving" ? "Sending…" : "Submit report"}
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
          ← Mock papers
        </button>
        <h1 className="page-title">Report Card</h1>
        <p className="page-sub">
          {user.name} · {meta.subjectName} · Mock Paper {mockNum} · time{" "}
          {fmtTime(seconds)}
          {autoSubmitted && " · ⏱ auto-submitted (time up)"}
          {saveState === "saving" && " · saving result…"}
          {saveState === "saved" && " · ✓ result saved"}
          {saveState === "error" && " · ⚠ result not saved"}
        </p>

        <div className="scorebox">
          <div className="score-num">
            {results.correct}/{results.total}
          </div>
          <div className="score-pct">{pct}% correct</div>
          <div className="stat-row">
            <div className="stat correct" style={{ "--i": 0 }}>
              <div className="n">{results.correct}</div>
              <div className="l">Correct</div>
            </div>
            <div className="stat wrong" style={{ "--i": 1 }}>
              <div className="n">{results.wrong}</div>
              <div className="l">Wrong</div>
            </div>
            <div className="stat skipped" style={{ "--i": 2 }}>
              <div className="n">{results.skipped}</div>
              <div className="l">Unattempted</div>
            </div>
          </div>
        </div>

        <div className="center-actions">
          <a className="btn" href={meta.base}>
            Other mock papers
          </a>
          <a className="btn ghost" href="/">
            Home
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
            Review
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
                      ? "Correct"
                      : state === "wrong"
                      ? "Wrong"
                      : "Skipped"}
                  </span>
                  <button
                    className="tool-btn report"
                    onClick={() => openReport(i)}
                  >
                    ⚐ Report
                  </button>
                </div>
              </div>
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
                  <b>Explanation:</b> {tr(q.explanation)}
                </div>
              )}
            </div>
          );
        })}

        <div className="center-actions">
          <a className="btn" href={meta.base}>
            Other mock papers
          </a>
          <a className="btn ghost" href="/">
            Home
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
        ← Mock papers
      </button>
      <div className="breadcrumb">
        <a href="/">Home</a>
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
        <span>Mock {mockNum}</span>
      </div>

      <div className="quiz-bar">
        <div className="meta">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="mode-badge">
              {mode === "exam" ? "Exam" : "Practice"}
            </span>
            <span>
              <strong>{meta.subjectName}</strong> · Mock {mockNum} · Q{" "}
              <strong>{current + 1}</strong>/{questions.length} · Answered{" "}
              <strong>{answeredCount}</strong>
            </span>
          </div>
          <div className="muted-sm" style={{ marginTop: 4 }}>
            {user.name}{" "}
            <button className="linklike" onClick={changeUser}>
              (change)
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
            Submit test
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
        <div className="q-head" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <span className="q-num">
            Question {current + 1}/{questions.length}
          </span>
          <div className="q-tools">
            <button
              className={`tool-btn ${marked.has(current) ? "marked" : ""}`}
              onClick={() => toggleMark(current)}
            >
              {marked.has(current) ? "★ Marked" : "☆ Mark for review"}
            </button>
            <button className="tool-btn report" onClick={() => openReport(current)}>
              ⚐ Report
            </button>
          </div>
        </div>
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
                ? "✓ Correct!"
                : `✗ Incorrect — the correct answer is ${q.correct}.`}
            </div>
            {q.explanation && (
              <div className="explain">
                <b>Explanation:</b> {tr(q.explanation)}
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
            ← Previous
          </button>
          {current < questions.length - 1 ? (
            <button
              className="btn"
              onClick={() =>
                setCurrent((c) => Math.min(questions.length - 1, c + 1))
              }
            >
              Next →
            </button>
          ) : (
            <button className="btn success" onClick={handleSubmit}>
              Submit test
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
          <i className="lg-swatch notvisited" /> Not visited
        </span>
        <span>
          <i className="lg-swatch seen" /> Not answered
        </span>
        <span>
          <i className="lg-swatch answered" /> Answered
        </span>
        <span>
          <i className="lg-swatch marked" /> Marked for review
        </span>
      </div>

      {renderReportModal()}
    </div>
  );
}
