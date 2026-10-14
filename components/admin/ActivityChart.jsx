"use client";

import { useEffect, useRef, useState } from "react";
import { fmtDay, nf } from "./format";

/**
 * One bar per day: papers submitted, or people who submitted at least one.
 * The two are switched rather than drawn together, so there is one scale.
 *
 * Hovering, touching or arrowing across the chart reads out one day.
 */

const HEIGHT = 220;
const PAD = { top: 14, right: 8, bottom: 26, left: 36 };
const METRICS = [
  { id: "papers", label: "Papers submitted", unit: (n) => (n === 1 ? "paper" : "papers") },
  { id: "people", label: "People active", unit: (n) => (n === 1 ? "person" : "people") },
];

// A round number at or above the tallest bar, and four even steps up to it.
function scale(max) {
  if (max <= 4) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].map((m) => (m * pow) / 4).find((s) => s * 4 >= max && Number.isInteger(s)) || pow * 2.5;
  return { top: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
}

export default function ActivityChart({ daily, ranges, days, onDays }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(680);
  const [metric, setMetric] = useState("papers");
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

  const m = METRICS.find((x) => x.id === metric);
  const n = daily.length;
  const { top, ticks } = scale(Math.max(...daily.map((d) => d[metric]), 0));
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerW / n;
  const barW = Math.max(1, slot - 2);
  const base = PAD.top + innerH;
  const yOf = (v) => PAD.top + (1 - v / top) * innerH;

  const bar = (i, v) => {
    const x = PAD.left + i * slot + (slot - barW) / 2;
    const y = yOf(v);
    const r = Math.min(4, barW / 2, base - y);
    return `M${x} ${base}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + barW - r}Q${x + barW} ${y} ${x + barW} ${y + r}V${base}Z`;
  };

  const nearest = (clientX) => {
    const box = wrapRef.current.getBoundingClientRect();
    return Math.min(n - 1, Math.max(0, Math.floor((clientX - box.left - PAD.left) / slot)));
  };
  const onKeyDown = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const from = active ?? n - 1;
    setActive(Math.min(n - 1, Math.max(0, from + (e.key === "ArrowRight" ? 1 : -1))));
  };

  const hit = active !== null ? daily[active] : null;
  const total = daily.reduce((sum, d) => sum + d.papers, 0);
  const labelAt = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : [0, n - 1];

  return (
    <section className="q-card dash-chart">
      <div className="dash-chart-head">
        <div>
          <h2 className="dash-card-title">{m.label} per day</h2>
          <p className="dash-note">
            {nf(total)} papers in the last {days} days. Days are India time.
          </p>
        </div>
        <div className="admin-chart-controls">
          <div className="dash-filter" role="group" aria-label="Measure">
            {METRICS.map((x) => (
              <button key={x.id} type="button" className={x.id === metric ? "active" : ""} aria-pressed={x.id === metric} onClick={() => setMetric(x.id)}>
                {x.id === "papers" ? "Papers" : "People"}
              </button>
            ))}
          </div>
          <div className="dash-filter" role="group" aria-label="Period">
            {ranges.map((d) => (
              <button key={d} type="button" className={d === days ? "active" : ""} aria-pressed={d === days} onClick={() => { setActive(null); onDays(d); }}>
                {d} days
              </button>
            ))}
          </div>
        </div>
      </div>

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
          aria-label={`${m.label} per day, last ${days} days`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className="dash-grid" x1={PAD.left} x2={width - PAD.right} y1={yOf(t)} y2={yOf(t)} />
              <text className="dash-tick" x={PAD.left - 8} y={yOf(t)} dy="0.32em" textAnchor="end">
                {nf(t)}
              </text>
            </g>
          ))}
          {daily.map((d, i) =>
            d[metric] > 0 ? (
              <path key={d.day} className={`admin-bar${i === active ? " active" : ""}`} d={bar(i, d[metric])} />
            ) : null
          )}
          {labelAt.map((i, k) => (
            <text
              key={i}
              className="dash-tick"
              x={k === 0 ? PAD.left : k === labelAt.length - 1 ? width - PAD.right : PAD.left + (i + 0.5) * slot}
              y={HEIGHT - 7}
              textAnchor={k === 0 ? "start" : k === labelAt.length - 1 ? "end" : "middle"}
            >
              {fmtDay(daily[i].day)}
            </text>
          ))}
        </svg>

        {hit && (
          <div
            className="dash-tip"
            style={{
              left: Math.min(width - 80, Math.max(80, PAD.left + (active + 0.5) * slot)),
              top: yOf(hit[metric]),
            }}
          >
            <b>
              {nf(hit[metric])} {m.unit(hit[metric])}
            </b>
            <span>{fmtDay(hit.day, true)}</span>
            <span className="dash-tip-meta">
              {metric === "papers"
                ? `by ${nf(hit.people)} ${hit.people === 1 ? "person" : "people"}`
                : `${nf(hit.papers)} ${hit.papers === 1 ? "paper" : "papers"} between them`}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
