import { notFound } from "next/navigation";
import {
  getManifest,
  findSection,
  findGroup,
  findSubject,
} from "@/lib/data";
import { SUBJECTS, subjectIcon, firstLetter } from "@/lib/subjects";
import { uiText, uiFormat } from "@/lib/ui-text";
import { bi } from "@/lib/site-lang";
import { getSiteLang } from "@/lib/site-lang-server";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";
import MockPaperGrid from "@/components/MockPaperGrid";
import SubjectIcon from "@/components/SubjectIcon";

// The two full-mock choosers, and the extra choices each paper asks for.
const FULL_MOCKS = {
  paper1: {
    subject: "paper1-full",
    sub: "fullMocksSub1",
    split: "fullMockSplit1",
    streams: null,
  },
  paper2: {
    subject: "paper2-full",
    sub: "fullMocksSub2",
    split: "fullMockSplit2",
    streams: ["mathematics-science", "social-studies"],
  },
};

// The query values the mock page reads (see [mock]/page.jsx).
const STREAM_VALUE = { "mathematics-science": "science", "social-studies": "social" };

export default async function SubjectPage({ params }) {
  const lang = getSiteLang();
  const T = uiText(lang);
  const subjectLabel = (id) => bi(lang, SUBJECTS[id].en, SUBJECTS[id].hi, true);

  const manifest = await getManifest();
  const section = findSection(manifest, params.section);
  const sectionName = section
    ? bi(lang, section.name, section.nameHi, true)
    : params.section;

  const full = FULL_MOCKS[params.section];
  if (full && params.group === "main" && params.subject === full.subject) {
    const paperEn = section?.name || params.section;
    const paperHi = section?.nameHi || paperEn;
    const radio = (name, value, label, checked) => (
      <label className="radio-card" key={value}>
        <input type="radio" name={name} value={value} defaultChecked={checked} />
        <span>{label}</span>
      </label>
    );

    return (
      <div data-exam="uptet">
        <BackLink href={`/${params.section}`} label={sectionName} />
        <Breadcrumb
          items={[
            { label: T.home, href: "/" },
            { label: "UP TET", href: "/uptet" },
            { label: sectionName, href: `/${params.section}` },
            { label: T.fullMocksCrumb },
          ]}
        />
        <h1 className="page-title">
          {uiFormat(lang, "fullMocksTitle", [paperEn], [paperHi])}
        </h1>
        <p className="page-sub">{T[full.sub]}</p>
        <div className="grid two">
          {[1, 2, 3].map((n) => (
            <div key={n} className="paper-card" style={{ "--i": n }}>
              <h3 className="paper-title">{T.fullMockN(n)}</h3>
              <div className="paper-blurb">{T[full.split]}</div>
              <form
                action={`/${params.section}/${params.group}/${params.subject}/${n}`}
                method="get"
              >
                {full.streams && (
                  <div className="field-group">
                    <div className="field-label">{T.chooseStreamLabel}</div>
                    <div className="radio-group radio-grid">
                      {full.streams.map((id, i) =>
                        radio("stream", STREAM_VALUE[id], subjectLabel(id), i === 0)
                      )}
                    </div>
                  </div>
                )}
                <div
                  className="field-group"
                  style={full.streams ? { marginTop: 12 } : undefined}
                >
                  <div className="field-label">
                    {full.streams ? T.chooseLanguageSection : T.chooseThird}
                  </div>
                  <div className="radio-group radio-grid">
                    {radio("lang", "english", subjectLabel("english"), true)}
                    {radio("lang", "sanskrit", subjectLabel("sanskrit"), false)}
                  </div>
                </div>
                <div className="muted-sm" style={{ marginTop: 8 }}>
                  {T.hindiMandatory}
                </div>
                <button
                  className="btn"
                  type="submit"
                  style={{ marginTop: 12, width: "100%" }}
                >
                  {T.startMockN(n)}
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const group = findGroup(section, params.group);
  const subject = findSubject(group, params.subject);
  if (!section || !group || !subject) notFound();

  const size = manifest.mockSize;
  const multiGroup = section.groups.length > 1;
  const groupName = bi(lang, group.name, group.nameHi, true);
  const subjectName = bi(lang, subject.name, subject.nameHi, true);
  const backHref = multiGroup ? `/${section.id}/${group.id}` : `/${section.id}`;

  return (
    <div data-exam="uptet">
      <BackLink href={backHref} label={multiGroup ? groupName : sectionName} />
      <Breadcrumb
        items={[
          { label: T.home, href: "/" },
          { label: "UP TET", href: "/uptet" },
          { label: sectionName, href: `/${section.id}` },
          ...(multiGroup
            ? [{ label: groupName, href: `/${section.id}/${group.id}` }]
            : []),
          { label: subjectName },
        ]}
      />
      <div className="page-title-row">
        <SubjectIcon
          icon={subjectIcon(subject.id)}
          letter={firstLetter(subjectName)}
          size={48}
        />
        <h1 className="page-title">{subjectName}</h1>
      </div>
      <p className="page-sub">{T.topicSub(subject.total, subject.mocks)}</p>
      <MockPaperGrid
        papers={Array.from({ length: subject.mocks }, (_, i) => ({
          href: `/${section.id}/${group.id}/${subject.id}/${i + 1}`,
          title: T.mockPaper(i + 1),
          meta: T.questionCount(Math.min(size, subject.total - i * size)),
        }))}
        labels={{
          start: T.startTest,
          resume: T.resume,
          retake: T.retake,
          inProgress: T.inProgress,
        }}
      />
    </div>
  );
}
