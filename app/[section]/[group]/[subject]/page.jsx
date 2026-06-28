import { notFound } from "next/navigation";
import {
  getManifest,
  findSection,
  findGroup,
  findSubject,
} from "@/lib/data";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";

export default async function SubjectPage({ params }) {
  const manifest = await getManifest();

  if (
    params.section === "paper1" &&
    params.group === "main" &&
    params.subject === "paper1-full"
  ) {
    return (
      <div>
        <BackLink href="/" label="Home" />
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Paper 1", href: "/paper1" },
            { label: "Full Mock Papers" },
          ]}
        />
        <h1 className="page-title">Paper 1 Full Mock Papers</h1>
        <p className="page-sub">
          Pick a language and start a full Paper 1 mock paper with 150 questions across five sections: Child Development & Pedagogy, Hindi, your chosen third section, Environmental Studies, and Mathematics.
        </p>
        <div className="grid two">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card hero-card" style={{ "--i": n }}>
              <div className="card-title">Full Mock Paper {n}</div>
              <div className="card-meta">150 questions · 30 from each section</div>
              <form action={`/${params.section}/${params.group}/${params.subject}/${n}`} method="get">
                <label className="field-label" htmlFor={`lang-${n}`}>Choose the third section</label>
                <select id={`lang-${n}`} className="text-input" name="lang" defaultValue="english">
                  <option value="english">English</option>
                  <option value="sanskrit">Sanskrit</option>
                </select>
                <div className="muted-sm" style={{ marginTop: 8 }}>
                  Hindi is always included as a mandatory section.
                </div>
                <button className="btn" type="submit" style={{ marginTop: 12, width: "100%" }}>
                  Start Mock Paper {n} →
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (
    params.section === "paper2" &&
    params.group === "main" &&
    params.subject === "paper2-full"
  ) {
    return (
      <div>
        <BackLink href="/" label="Home" />
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Paper 2", href: "/paper2" },
            { label: "Full Mock Papers" },
          ]}
        />
        <h1 className="page-title">Paper 2 Full Mock Papers</h1>
        <p className="page-sub">
          Pick your stream and language, then start a full Paper 2 mock paper with 150 questions: 30 from CDP, 30 from Hindi, 30 from English or Sanskrit, and 60 from the chosen stream.
        </p>
        <div className="grid two">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card hero-card" style={{ "--i": n }}>
              <div className="card-title">Full Mock Paper {n}</div>
              <div className="card-meta">150 questions · 30 + 30 + 30 + 60</div>
              <form action={`/${params.section}/${params.group}/${params.subject}/${n}`} method="get">
                <label className="field-label" htmlFor={`stream-${n}`}>Choose stream</label>
                <select id={`stream-${n}`} className="text-input" name="stream" defaultValue="science">
                  <option value="science">Mathematics & Science</option>
                  <option value="social">Social Studies</option>
                </select>
                <label className="field-label" htmlFor={`lang-${n}`} style={{ marginTop: 12 }}>
                  Choose the language section
                </label>
                <select id={`lang-${n}`} className="text-input" name="lang" defaultValue="english">
                  <option value="english">English</option>
                  <option value="sanskrit">Sanskrit</option>
                </select>
                <div className="muted-sm" style={{ marginTop: 8 }}>
                  Hindi is always included as a mandatory section.
                </div>
                <button className="btn" type="submit" style={{ marginTop: 12, width: "100%" }}>
                  Start Mock Paper {n} →
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (params.section === "paper2" && params.group === "main" && params.subject === "paper2-full") {
    return (
      <div>
        <BackLink href="/" label="Home" />
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Paper 2", href: "/paper2" },
            { label: "Full Mock Papers" },
          ]}
        />
        <h1 className="page-title">Paper 2 Full Mock Papers</h1>
        <p className="page-sub">
          Pick your stream and language, then start a full Paper 2 mock paper with 150 questions: 30 from CDP, 30 from Hindi, 30 from English or Sanskrit, and 60 from the chosen stream.
        </p>
        <div className="grid two">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card hero-card" style={{ "--i": n }}>
              <div className="card-title">Full Mock Paper {n}</div>
              <div className="card-meta">150 questions · 30 + 30 + 30 + 60</div>
              <form action={`/${params.section}/${params.group}/${params.subject}/${n}`} method="get">
                <label className="field-label" htmlFor={`stream-${n}`}>Choose stream</label>
                <select id={`stream-${n}`} className="text-input" name="stream" defaultValue="science">
                  <option value="science">Mathematics & Science</option>
                  <option value="social">Social Studies</option>
                </select>
                <label className="field-label" htmlFor={`lang-${n}`} style={{ marginTop: 12 }}>
                  Choose the language section
                </label>
                <select id={`lang-${n}`} className="text-input" name="lang" defaultValue="english">
                  <option value="english">English</option>
                  <option value="sanskrit">Sanskrit</option>
                </select>
                <div className="muted-sm" style={{ marginTop: 8 }}>
                  Hindi is always included as a mandatory section.
                </div>
                <button className="btn" type="submit" style={{ marginTop: 12, width: "100%" }}>
                  Start Mock Paper {n} →
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const section = findSection(manifest, params.section);
  const group = findGroup(section, params.group);
  const subject = findSubject(group, params.subject);
  if (!section || !group || !subject) notFound();

  const size = manifest.mockSize;
  const papers = Array.from({ length: subject.mocks }, (_, i) => {
    const start = i * size;
    const count = Math.min(size, subject.total - start);
    return { n: i + 1, count };
  });

  const backHref =
    section.groups.length > 1
      ? `/${section.id}/${group.id}`
      : `/${section.id}`;
  const backLabel = section.groups.length > 1 ? group.name : section.name;

  return (
    <div>
      <BackLink href={backHref} label={backLabel} />
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: section.name, href: `/${section.id}` },
          ...(section.groups.length > 1
            ? [{ label: group.name, href: `/${section.id}/${group.id}` }]
            : []),
          { label: subject.name },
        ]}
      />
      <h1 className="page-title">{subject.name}</h1>
      <p className="page-sub">
        {subject.total} questions · {subject.mocks} mock paper
        {subject.mocks > 1 ? "s" : ""}. Each paper is scored at the end.
      </p>
      <div className="grid">
        {papers.map((p, i) => (
          <a
            key={p.n}
            href={`/${section.id}/${group.id}/${subject.id}/${p.n}`}
            className="card"
            style={{ "--i": i }}
          >
            <div className="card-title">Mock Paper {p.n}</div>
            <div className="card-meta">{p.count} questions</div>
            <span className="pill">Start test →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
