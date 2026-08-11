"use client";

import { useEffect, useState } from "react";

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = window.localStorage.getItem("welcomeModalSeen");
    if (!seen) {
      setOpen(true);
    }
  }, []);

  const closeModal = () => {
    window.localStorage.setItem("welcomeModalSeen", "1");
    setOpen(false);
  };

  if (!mounted || !open) return null;

  return (
    <div className="welcome-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="welcome-modal">
        <button
          className="welcome-modal-close"
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close welcome dialog"
        >
          ×
        </button>
        <h2 id="welcome-title">Welcome to Octopus Prep</h2>
        <p className="welcome-modal-text">
          This app is designed for UP TET and CTET exam preparation. You can practice with subject-wise mock tests that match the exam pattern and get instant scoring feedback.
        </p>
        <p className="welcome-modal-text">
          यह ऐप UP TET और CTET परीक्षा की तैयारी के लिए है। आप यहाँ विषय-वार मॉक टेस्ट देकर अभ्यास कर सकते हैं और हर पेपर के अंत में अपना स्कोर देख सकते हैं।
        </p>
        <div className="welcome-modal-steps">
          <strong>How to use the app / उपयोग कैसे करें:</strong>
          <ol>
            <li>Choose the exam you are preparing for. / उस परीक्षा का चयन करें जिसकी आप तैयारी कर रहे हैं।</li>
            <li>Pick the paper or section, then a subject or topic. / पेपर या सेक्शन चुनें, फिर विषय या टॉपिक चुनें।</li>
            <li>Open a mock test, answer the questions and review your score. / मॉक टेस्ट खोलें, उत्तर दें और अपना स्कोर देखें।</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
