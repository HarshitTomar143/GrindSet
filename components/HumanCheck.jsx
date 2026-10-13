"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { uiText } from "@/lib/ui-text";

// The Turnstile widget, shown in place of a paper (lib/human-check.js). Once
// it is solved the page is loaded again, this time with the pass cookie.
export default function HumanCheck({ siteKey, lang }) {
  const T = uiText(lang);
  const box = useRef(null);
  const widget = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (window.turnstile) setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !box.current || widget.current !== null) return;

    const confirm = async (token) => {
      try {
        const res = await fetch("/api/human", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) throw new Error();
        window.location.reload();
      } catch {
        setFailed(true);
        window.turnstile.reset(widget.current);
      }
    };

    widget.current = window.turnstile.render(box.current, {
      sitekey: siteKey,
      language: lang === "en" ? "en" : "hi",
      callback: confirm,
      "error-callback": () => setFailed(true),
    });
    return () => {
      window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [ready, siteKey, lang]);

  return (
    <div style={{ maxWidth: 520, margin: "40px auto" }}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <h1 className="page-title">{T.humanCheckTitle}</h1>
      <p className="page-sub">{T.humanCheckBody}</p>
      <div ref={box} />
      {failed && (
        <div style={{ color: "var(--red)", fontSize: 14, marginTop: 10 }}>{T.humanCheckFailed}</div>
      )}
    </div>
  );
}
