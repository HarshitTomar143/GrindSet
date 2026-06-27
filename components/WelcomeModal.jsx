"use client";

import { useState } from "react";

export default function WelcomeModal() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

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
          This app is designed for UP TET exam preparation. You can practice with subject-wise mock tests that match the exam pattern and get instant scoring feedback.
        </p>
        <p className="welcome-modal-text">
          यह ऐप UP TET परीक्षा की तैयारी के लिए है। आप यहाँ विषय-वार मॉक टेस्ट देकर अभ्यास कर सकते हैं और हर पेपर के अंत में अपना स्कोर देख सकते हैं।
        </p>
        <div className="welcome-modal-steps">
          <strong>How to use the app / उपयोग कैसे करें:</strong>
          <ol>
            <li>Select the paper level you are preparing for. / उस पेपर स्तर का चयन करें जिसके लिए आप तैयारी कर रहे हैं।</li>
            <li>Pick a subject and open the corresponding mock test. / एक विषय चुनें और संबंधित मॉक टेस्ट खोलें।</li>
            <li>Answer the questions and review your score when finished. / सवालों के उत्तर दें और पूरा होने पर अपना स्कोर देखें।</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
