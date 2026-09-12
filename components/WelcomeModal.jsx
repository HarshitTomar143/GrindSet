"use client";

import { useCallback, useEffect, useState } from "react";
import LangSwitch from "@/components/LangSwitch";
import { uiText } from "@/lib/ui-text";

/**
 * Shown once, on a reader's first visit to the chooser. It opens with the
 * language choice, since Hindi is only the default and this is the first
 * moment a reader who wants English can say so.
 *
 * Every way out of the dialog marks it as seen — closing it used to leave the
 * flag unwritten, so the same explainer reappeared on every visit.
 */
export default function WelcomeModal({ lang }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem("welcomeModalSeen")) setOpen(true);
    } catch {
      // storage blocked: show nothing rather than showing it every time
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem("welcomeModalSeen", "1");
    } catch {}
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div
      className="welcome-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      onClick={dismiss}
    >
      <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="welcome-modal-close"
          type="button"
          onClick={dismiss}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="welcome-title">Octopus में आपका स्वागत है · Welcome</h2>

        <div className="welcome-lang">
          <strong>अपनी भाषा चुनें · Choose your language</strong>
          <LangSwitch lang={lang} label="भाषा · Language" large />
          <span className="muted-sm">
            इसे ऊपर हेडर से कभी भी बदल सकते हैं · You can change it any time
            from the header.
          </span>
        </div>

        <p className="welcome-modal-text">
          यह ऐप UP TET, CTET और UP TGT / PGT परीक्षा की तैयारी के लिए है। यहाँ
          विषय-वार मॉक टेस्ट देकर अभ्यास कीजिए और हर पेपर के अंत में अपना स्कोर
          और व्याख्या देखिए।
        </p>
        <p className="welcome-modal-text">
          Practice papers for UP TET, CTET and UP TGT / PGT, built from
          previous-year questions. Papers are timed like the real
          computer-based test and scored as soon as you submit.
        </p>
        <div className="welcome-modal-steps">
          <strong>यह कैसे चलता है / How it works</strong>
          <ol>
            <li>अपनी परीक्षा चुनें। / Choose your exam.</li>
            <li>
              पेपर या विषय चुनें, फिर अध्याय। / Pick a paper or subject, then a
              topic.
            </li>
            <li>
              पेपर हल करें और हर प्रश्न की व्याख्या देखें। / Answer the paper
              and review every explanation.
            </li>
          </ol>
        </div>
        <button
          className="btn"
          type="button"
          onClick={dismiss}
          style={{ width: "100%", marginTop: 4 }}
        >
          {uiText(lang).startPractising}
        </button>
      </div>
    </div>
  );
}
