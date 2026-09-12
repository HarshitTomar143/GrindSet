"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE } from "@/lib/site-lang";

const OPTIONS = [
  { id: "hi", short: "हिं", long: "हिन्दी" },
  { id: "en", short: "EN", long: "English" },
  { id: "both", short: "हिं+EN", long: "हिन्दी + English" },
];

/**
 * Hindi / English / both, for the whole site.
 *
 * The choice is written to a cookie and the current page re-rendered on the
 * server, so the page changes language in place: nothing reloads, and a paper
 * being written keeps its answers and its clock.
 */
export default function LangSwitch({ lang, label, large = false }) {
  const router = useRouter();
  const [current, setCurrent] = useState(lang);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setCurrent(lang);
  }, [lang]);

  const choose = (id) => {
    if (id === current) return;
    setCurrent(id); // highlight at once; the refresh takes a moment
    document.cookie = `${LANG_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  };

  return (
    <div
      className={`seg lang-switch${large ? " lang-switch-lg" : ""}`}
      role="group"
      aria-label={label}
      aria-busy={pending || undefined}
      title={label}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          lang={o.id === "en" ? "en" : "hi"}
          className={current === o.id ? "active" : ""}
          aria-pressed={current === o.id}
          onClick={() => choose(o.id)}
          title={o.long}
        >
          {large ? o.long : o.short}
        </button>
      ))}
    </div>
  );
}
