"use client";

import { useEffect, useRef, useState } from "react";
import { nf } from "./format";

/*
 * Pages already fetched this visit, by URL. Going back a page or returning to
 * a tab shows the remembered page at once and refreshes it quietly behind.
 */
const cache = new Map();
const CACHE_MAX = 60;

function remember(url, data) {
  cache.delete(url);
  cache.set(url, data);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

/** Drops remembered pages, e.g. after something was changed. */
export function forgetPages(prefix = "") {
  for (const key of [...cache.keys()]) if (key.startsWith(prefix)) cache.delete(key);
}

/**
 * Loads `url` and keeps the previous result on screen while the next page or
 * filter loads, instead of flashing back to "Loading…". `data` is null only on
 * the very first load.
 */
export function usePagedFetch(url) {
  const [state, setState] = useState(() => ({ data: cache.get(url) || null, error: null }));
  const [loading, setLoading] = useState(false);
  const latest = useRef(url);

  useEffect(() => {
    latest.current = url;
    const hit = cache.get(url);
    if (hit) setState({ data: hit, error: null });
    setLoading(true);
    fetch(url)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) throw new Error(data.error || "Failed to load");
        remember(url, data);
        if (latest.current === url) setState({ data, error: null });
      })
      .catch((e) => latest.current === url && setState((s) => ({ ...s, error: e.message })))
      .finally(() => latest.current === url && setLoading(false));
  }, [url]);

  return { ...state, loading };
}

/** The admin stats URL for one view and its filters (empty values left out). */
export function viewUrl(params) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null));
  return `/api/admin/stats?${new URLSearchParams(clean)}`;
}

/** Prev / next and a page jump. Hidden when everything fits on one page. */
export function Pager({ page, pages, total, onPage, loading, noun = "rows", newer }) {
  if (!pages || pages <= 1) return null;
  const go = (n) => {
    const next = Math.min(pages, Math.max(1, n));
    if (next !== page) onPage(next);
  };
  return (
    <div className="admin-pager">
      <button type="button" className="btn ghost" disabled={page <= 1} onClick={() => go(1)} aria-label="First page">
        «
      </button>
      <button type="button" className="btn ghost" disabled={page <= 1} onClick={() => go(page - 1)}>
        ← {newer ? "Newer" : "Previous"}
      </button>
      <span className="muted-sm admin-pager-pos">
        Page{" "}
        <select
          className="admin-pager-select"
          value={page}
          onChange={(e) => go(Number(e.target.value))}
          aria-label="Go to page"
        >
          {Array.from({ length: pages }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>{" "}
        of {nf(pages)} · {nf(total)} {noun}
        {loading && " · loading…"}
      </span>
      <button type="button" className="btn ghost" disabled={page >= pages} onClick={() => go(page + 1)}>
        {newer ? "Older" : "Next"} →
      </button>
      <button type="button" className="btn ghost" disabled={page >= pages} onClick={() => go(pages)} aria-label="Last page">
        »
      </button>
    </div>
  );
}

/**
 * The page number, which falls back to 1 whenever the filters change. Tied to
 * the filters directly (not reset in an effect), so a filter change never
 * fires a request for the old page first.
 */
export function usePage(filters) {
  const key = JSON.stringify(filters);
  const [state, setState] = useState({ key, page: 1 });
  const page = state.key === key ? state.page : 1;
  return [page, (n) => setState({ key, page: n })];
}

/** Debounced copy of a search box, so typing doesn't fire a request per key. */
export function useDebounced(value, ms = 300) {
  const [out, setOut] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setOut(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return out;
}
