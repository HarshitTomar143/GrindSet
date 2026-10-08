"use client";

import { useEffect, useState } from "react";
import { uiText, uiFormat } from "@/lib/ui-text";

const FONTS = ["sm", "md", "lg", "xl"];

export default function ThemeControls({ lang }) {
  const T = uiText(lang);
  const [theme, setTheme] = useState("light");
  const [font, setFont] = useState("md");

  // Read whatever the no-flash init script already applied.
  useEffect(() => {
    const el = document.documentElement;
    setTheme(el.getAttribute("data-theme") || "light");
    setFont(el.getAttribute("data-font") || "md");
  }, []);

  const applyTheme = (t) => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("theme", t);
    } catch {}
    setTheme(t);
  };

  const applyFont = (f) => {
    document.documentElement.setAttribute("data-font", f);
    try {
      localStorage.setItem("fontScale", f);
    } catch {}
    setFont(f);
  };

  const cycleFont = () =>
    applyFont(FONTS[(FONTS.indexOf(font) + 1) % FONTS.length]);

  const size = Math.max(0, FONTS.indexOf(font));
  const sizeLabel = uiFormat(
    lang,
    "textSize",
    [uiText("en").fontSizes[size]],
    [uiText("hi").fontSizes[size]]
  );
  const themeLabel = theme === "dark" ? T.toLight : T.toDark;

  return (
    <div className="theme-controls">
      <button
        className="tc-btn tc-font"
        onClick={cycleFont}
        title={sizeLabel}
        aria-label={sizeLabel}
      >
        <span className="tc-a-sm">A</span>
        <span className="tc-a-lg">A</span>
      </button>
      <button
        className="tc-btn"
        onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
        title={themeLabel}
        aria-label={themeLabel}
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>
    </div>
  );
}
