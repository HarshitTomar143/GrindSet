"use client";

import { useEffect, useRef, useState } from "react";
import { uiText } from "@/lib/ui-text";
import { scoreTrend } from "@/lib/score-trend";

/**
 * The candidate's scores as a line, one point per paper in the order they were
 * sat. Papers come in bursts - five in an evening, none for a week - so points
 * are spaced evenly rather than by date, and the dates sit on the ends.
 *
 * Hovering, touching or arrowing across the chart reads out one paper.
 */

const SHOWN_MAX = 40;
const HEIGHT = 240;
const PAD = { top: 18, right: 16, bottom: 30, left: 38 };
const TICKS = [0, 25, 50, 75, 100];
// Closer together than this and the dots run into each other.
const DOT_SPACING_MIN = 14;

const ARROW = { up: "▲", down: "▼", flat: "■" };

export default function ScoreChart({ attempts, exams, lang }) {
  const T = uiText(lang);
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(680);
  const [examId, setExamId] = useState("all");
  const [active, setActive] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => setWidth(Math.max(260, Math.round(el.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filtered = examId === "all" ? attempts : attempts.filter((a) => a.examId === examId);
  const points = filtered.slice(-SHOWN_MAX);
  const n = points.length;
  const trend = examId === "all" ? null : scoreTrend(filtered.map((a) => a.pct));

  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const xOf = (i) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yOf = (pct) => PAD.top + (1 - pct / 100) * innerH;
  const path = points.map((p, i) => `${i ? "L" : "M"}${xOf(i).toFixed(1)} ${yOf(p.pct).toFixed(1)}`).join(" ");
  const showDots = n === 1 || innerW / (n - 1) >= DOT_SPACING_MIN;

  // One qualifying line, and only when every paper shown shares the same mark.
  const marks = new Set(points.map((p) => p.passMark));
  const passMark = marks.size === 1 ? points[0]?.passMark ?? null : null;

  const nearest = (clientX) => {
    const box = wrapRef.current.getBoundingClientRect();
    if (n === 1) return 0;
    const i = Math.round(((clientX - box.left - PAD.left) / innerW) * (n - 1));
    return Math.min(n - 1, Math.max(0, i));
  };

  const onKeyDown = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const from = active ?? n - 1;
    setActive(Math.min(n - 1, Math.max(0, from + (e.key === "ArrowRight" ? 1 : -1))));
  };

  const pick = (id) => {
    setExamId(id);
    setActive(null);
  };

  const hit = active !== null ? points[active] : null;

  return (
    <section className="q-card dash-chart" data-exam={examId === "all" ? undefined : examId}>
      <div className="dash-chart-head">
        <div>
          <h2 className="dash-card-title">{T.dashChartTitle}</h2>
          <p className="dash-note">
            {T.dashChartSub}
            {filtered.length > SHOWN_MAX ? ` ${T.dashChartLast(SHOWN_MAX)}` : ""}
          </p>
        </div>
        {exams.length > 1 && (
          <div className="dash-filter" role="group" aria-label={T.exams}>
            {[{ id: "all", name: T.dashAllExams }, ...exams].map((e) => (
              <button
                key={e.id}
                type="button"
                className={e.id === examId ? "active" : ""}
                aria-pressed={e.id === examId}
                onClick={() => pick(e.id)}
              >
                {e.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {trend && (
        <p className="dash-note dash-chart-trend">
          <span className={`dash-arrow ${trend.dir}`} aria-hidden="true">{ARROW[trend.dir]}</span>{" "}
          <b>{T[{ up: "dashTrendUp", down: "dashTrendDown", flat: "dashTrendFlat" }[trend.dir]]}</b>
          {" · "}
          {T.dashTrendNote(trend.recent, trend.earlier, trend.span)}
        </p>
      )}

      <div
        className="dash-plot"
        ref={wrapRef}
        onPointerMove={(e) => setActive(nearest(e.clientX))}
        onPointerDown={(e) => setActive(nearest(e.clientX))}
        onPointerLeave={() => setActive(null)}
      >
        <svg
          width="100%"
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={T.dashChartTitle}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
        >
          {TICKS.map((t) => (
            <g key={t}>
              <line className="dash-grid" x1={PAD.left} x2={width - PAD.right} y1={yOf(t)} y2={yOf(t)} />
              <text className="dash-tick" x={PAD.left - 8} y={yOf(t)} dy="0.32em" textAnchor="end">
                {t}%
              </text>
            </g>
          ))}

          {passMark !== null && (
            <g>
              <line
                className="dash-pass"
                x1={PAD.left}
                x2={width - PAD.right}
                y1={yOf(passMark)}
                y2={yOf(passMark)}
              />
              <text className="dash-pass-label" x={width - PAD.right} y={yOf(passMark) - 6} textAnchor="end">
                {T.dashQualifying(passMark)}
              </text>
            </g>
          )}

          {hit && (
            <line
              className="dash-cross"
              x1={xOf(active)}
              x2={xOf(active)}
              y1={PAD.top}
              y2={PAD.top + innerH}
            />
          )}

          {n > 1 && <path className="dash-line" d={path} />}
          {points.map((p, i) =>
            showDots || i === active ? (
              <circle
                key={p.id}
                className={`dash-dot${i === active ? " active" : ""}`}
                cx={xOf(i)}
                cy={yOf(p.pct)}
                r={i === active ? 5.5 : 4}
              />
            ) : null
          )}

          {n > 0 && (
            <text className="dash-tick" x={n === 1 ? xOf(0) : PAD.left} y={HEIGHT - 8} textAnchor={n === 1 ? "middle" : "start"}>
              {points[0].when}
            </text>
          )}
          {n > 1 && (
            <text className="dash-tick" x={width - PAD.right} y={HEIGHT - 8} textAnchor="end">
              {points[n - 1].when}
            </text>
          )}
        </svg>

        {hit && (
          <div
            className="dash-tip"
            style={{
              left: Math.min(width - 96, Math.max(96, xOf(active))),
              top: yOf(hit.pct),
            }}
          >
            <b>{hit.pct}%</b>
            <span>
              {hit.name} · {T.mockShort(hit.mock)}
            </span>
            <span className="dash-tip-meta">
              {T.dashCorrectOf(hit.correct, hit.total)} · {hit.when}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
