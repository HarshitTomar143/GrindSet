import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { isTokenValid, adminConfigured, ADMIN_COOKIE } from "@/lib/admin";
import { getSubmission } from "@/lib/submissions";
import { getMockQuestions } from "@/lib/data";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

const LETTERS = ["A", "B", "C", "D"];

function fmtTime(s) {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default async function SubmissionDetail({ params }) {
  if (!adminConfigured() || !isTokenValid(cookies().get(ADMIN_COOKIE)?.value)) {
    redirect("/admin");
  }

  const sub = await getSubmission(parseInt(params.id, 10));
  if (!sub) notFound();

  const questions = await getMockQuestions(
    sub.section_id,
    sub.group_id,
    sub.subject_id,
    sub.mock_num
  );
  const answers = sub.answers || {};

  return (
    <div>
      <BackLink href="/admin" label="Dashboard" />
      <h1 className="page-title">{sub.name}</h1>
      <p className="page-sub">
        {sub.email ? sub.email + " · " : ""}
        {sub.section_name} · {sub.subject_name} · Mock {sub.mock_num} ·{" "}
        {new Date(sub.created_at).toLocaleString()}
      </p>

      <div className="scorebox">
        <div className="score-num">
          {sub.correct}/{sub.total}
        </div>
        <div className="score-pct">{sub.percentage}% · time {fmtTime(sub.duration_seconds)}</div>
        <div className="stat-row">
          <div className="stat correct">
            <div className="n">{sub.correct}</div>
            <div className="l">Correct</div>
          </div>
          <div className="stat wrong">
            <div className="n">{sub.wrong}</div>
            <div className="l">Wrong</div>
          </div>
          <div className="stat skipped">
            <div className="n">{sub.skipped}</div>
            <div className="l">Unattempted</div>
          </div>
        </div>
      </div>

      <h2 className="section-h">Answers</h2>
      {questions.map((q, i) => {
        const a = answers[String(i)];
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
                    <span className="otext">
                      {q.options[L]}
                      {L === a && L !== q.correct && (
                        <em className="muted-sm"> · their answer</em>
                      )}
                    </span>
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
    </div>
  );
}
