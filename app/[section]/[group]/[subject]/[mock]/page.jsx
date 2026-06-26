"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const LETTERS = ["A", "B", "C", "D"];

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

export default function QuizPage() {
  const { section, group, subject, mock } = useParams();
  const mockNum = parseInt(mock, 10);

  const [meta, setMeta] = useState(null); // {section,group,subject names}
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);

  const [answers, setAnswers] = useState({}); // idx -> letter
  const [current, setCurrent] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const [user, setUser] = useState(null); // {name, email}
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [saveState, setSaveState] = useState("idle"); // idle|saving|saved|error

  // remember the test-taker between tests (browser-local)
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("quizUser") || "null");
      if (u && u.name) setUser(u);
    } catch {}
  }, []);

  // Load manifest (for names) + the mock's questions from the API (DB-backed).
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

  // count-up timer: runs once the test-taker is identified, until submitted
  useEffect(() => {
    if (submitted || !questions || !user) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [submitted, questions, user]);

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

  // ---------- NAME GATE ----------
  if (!user) {
    return (
      <div style={{ maxWidth: 420, margin: "20px auto" }}>
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
          <button
            className="btn"
            type="submit"
            disabled={!nameInput.trim()}
            style={{ marginTop: 16, width: "100%" }}
          >
            Start test →
          </button>
        </form>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  const select = (idx, letter) =>
    setAnswers((prev) => ({ ...prev, [idx]: letter }));

  const handleSubmit = async () => {
    const unanswered = questions.length - answeredCount;
    const msg =
      unanswered > 0
        ? `You have ${unanswered} unanswered question(s). Submit anyway?`
        : "Submit your answers?";
    if (!window.confirm(msg)) return;

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

  const goBack = () => {
    if (
      !submitted &&
      answeredCount > 0 &&
      !window.confirm("Leave this test? Your answers will be lost.")
    )
      return;
    window.location.href = meta.base;
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

        <h2 className="page-title" style={{ fontSize: 20 }}>
          Review
        </h2>
        {questions.map((q, i) => {
          const a = answers[i];
          const state = !a ? "skipped" : a === q.correct ? "correct" : "wrong";
          return (
            <div className="review-q" key={i}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span className="q-num">{i + 1}</span>
                <span className={`tag ${state}`}>
                  {state === "correct"
                    ? "Correct"
                    : state === "wrong"
                    ? "Wrong"
                    : "Skipped"}
                </span>
              </div>
              <div className="q-text" style={{ fontSize: 16 }}>
                {q.question}
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
                      <span className="otext">{q.options[L]}</span>
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <div className="explain">
                  <b>Explanation:</b> {q.explanation}
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
      </div>
    );
  }

  // ---------- QUIZ ----------
  const q = questions[current];
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
          <div>
            <strong>{meta.subjectName}</strong> · Mock Paper {mockNum} ·{" "}
            Question <strong>{current + 1}</strong> of {questions.length} ·{" "}
            Answered <strong>{answeredCount}</strong>
          </div>
          <div className="muted-sm" style={{ marginTop: 4 }}>
            {user.name}{" "}
            <button className="linklike" onClick={changeUser}>
              (change)
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span className="timer">⏱ {fmtTime(seconds)}</span>
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
        <div className="q-head">
          <span className="q-num">
            Question {current + 1}/{questions.length}
          </span>
        </div>
        <div className="q-text">{q.question}</div>
        <div className="options" key={current}>
          {LETTERS.filter((L) => q.options[L]).map((L, idx) => {
            const selected = answers[current] === L;
            return (
              <button
                key={L}
                className={`option ${selected ? "selected" : ""}`}
                style={{ "--i": idx }}
                onClick={() => select(current, L)}
              >
                <span className="radio" aria-hidden="true" />
                <span className="otext">{q.options[L]}</span>
              </button>
            );
          })}
        </div>

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
        {questions.map((_, i) => {
          let cls = "";
          if (answers[i]) cls += " answered";
          if (i === current) cls += " current";
          return (
            <button
              key={i}
              className={cls.trim()}
              onClick={() => setCurrent(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
