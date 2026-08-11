import WelcomeModal from "@/components/WelcomeModal";

// The two exams the app currently carries question banks for.
const EXAMS = [
  {
    id: "uptet",
    href: "/uptet",
    name: "UP TET",
    eyebrow: "Uttar Pradesh Teacher Eligibility Test",
    blurb:
      "Subject-wise mock papers for Paper 1 and Paper 2, plus full-length 150-question mocks that follow the real paper pattern.",
    facts: ["Paper 1 & Paper 2", "Subject mocks", "Full mocks", "Bilingual"],
    meta: "Paper 1 · Paper 2 (Maths & Science / Social Studies)",
  },
  {
    id: "ctet",
    href: "/ctet",
    name: "CTET",
    eyebrow: "Central Teacher Eligibility Test",
    blurb:
      "Previous-year practice for Paper 1 and both Paper 2 streams, plus a topic-wise Hindi Sahitya bank built from separate question sets.",
    facts: ["Paper 1", "Paper 2 Science", "Paper 2 SST", "Hindi Sahitya"],
    meta: "4 sections · 30 questions per mock paper",
  },
];

export default function Home() {
  return (
    <div>
      <WelcomeModal />
      <h1 className="page-title">Choose your exam</h1>
      <p className="page-sub">
        Pick the exam you are preparing for. Each one has its own question bank
        of previous-year papers, split into mock tests that are scored as soon
        as you submit.
      </p>
      <div className="app-disclaimer">
        <strong>Disclaimer:</strong> This application is for practice only. It
        provides TET-style mock tests to help you prepare, but it is not an
        official exam platform.
      </div>
      <div className="grid two">
        {EXAMS.map((exam, i) => (
          <a
            key={exam.id}
            href={exam.href}
            className="card hero-card"
            style={{ "--i": i }}
          >
            <span className="card-eyebrow">{exam.eyebrow}</span>
            <div className="card-title">{exam.name}</div>
            <p className="card-blurb">{exam.blurb}</p>
            <div className="fact-row">
              {exam.facts.map((f) => (
                <span className="fact" key={f}>
                  {f}
                </span>
              ))}
            </div>
            <div className="card-meta">{exam.meta}</div>
            <span className="pill">Start practicing →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
