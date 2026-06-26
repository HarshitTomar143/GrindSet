"use client";

import { useEffect, useState } from "react";

const FONTS = ["sm", "md", "lg", "xl"];
const FONT_LABEL = { sm: "Small", md: "Normal", lg: "Large", xl: "Extra large" };

export default function ThemeControls() {
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

  return (
    <div className="theme-controls">
      <button
        className="tc-btn tc-font"
        onClick={cycleFont}
        title={`Text size: ${FONT_LABEL[font]} (tap to change)`}
        aria-label={`Text size: ${FONT_LABEL[font]}`}
      >
        <span className="tc-a-sm">A</span>
        <span className="tc-a-lg">A</span>
      </button>
      <button
        className="tc-btn"
        onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-label="Toggle dark mode"
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>
    </div>
  );
}
