import { notFound } from "next/navigation";
import { getManifest, findSection } from "@/lib/data";
import { uiText, uiFormat } from "@/lib/ui-text";
import { bi } from "@/lib/site-lang";
import { getSiteLang } from "@/lib/site-lang-server";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";
import SubjectGrid from "@/components/SubjectGrid";

// The papers that have a full-length mock, and the ui-text key describing it.
const FULL_MOCK_BLURB = { paper1: "fullMockBlurb1", paper2: "fullMockBlurb2" };

const nf = (n) => n.toLocaleString("en-IN");

export default async function SectionPage({ params }) {
  const lang = getSiteLang();
  const T = uiText(lang);
  const manifest = await getManifest();
  const section = findSection(manifest, params.section);
  if (!section) notFound();

  const sectionName = bi(lang, section.name, section.nameHi, true);
  const crumbs = [
    { label: T.home, href: "/" },
    { label: "UP TET", href: "/uptet" },
    { label: sectionName },
  ];

  // Single group (e.g. Paper 1): show subjects directly.
  if (section.groups.length === 1) {
    const g = section.groups[0];
    const hasFullMocks = section.id in FULL_MOCK_BLURB;
    const subjectQuestions = g.subjects.reduce((a, s) => a + s.total, 0);

    return (
      <div data-exam="uptet">
        <BackLink href="/uptet" label="UP TET" />
        <Breadcrumb items={crumbs} />
        <h1 className="page-title">UP TET · {sectionName}</h1>
        <p className="page-sub">{T.sectionSub(g.subjects.length, subjectQuestions)}</p>

        {hasFullMocks && (
          <a
            href={`/${section.id}/${g.id}/${section.id}-full`}
            className="fullmock-card"
          >
            <div className="fullmock-body">
              <span className="paper-eyebrow">{T.fullMockEyebrow}</span>
              <h2 className="fullmock-title">
                {uiFormat(
                  lang,
                  "fullMockTitle",
                  [section.name],
                  [section.nameHi || section.name]
                )}
              </h2>
              <p className="fullmock-blurb">{T[FULL_MOCK_BLURB[section.id]]}</p>
              <div className="paper-facts">
                {T.fullMockFacts.map((f) => (
                  <span className="fact" key={f}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <span className="paper-cta">{T.startFullMock}</span>
          </a>
        )}

        <h2 className="strip-title">{T.subjectWise}</h2>
        <SubjectGrid
          sectionId={section.id}
          groupId={g.id}
          subjects={g.subjects}
          lang={lang}
        />
      </div>
    );
  }

  // Multiple groups (e.g. Paper 2 streams): show stream cards.
  return (
    <div data-exam="uptet">
      <BackLink href="/uptet" label="UP TET" />
      <Breadcrumb items={crumbs} />
      <h1 className="page-title">UP TET · {sectionName}</h1>
      <p className="page-sub">{T.chooseStream}</p>
      <div className="paper-grid">
        {section.groups.map((g, i) => {
          const total = g.subjects.reduce((a, s) => a + s.total, 0);
          const mocks = g.subjects.reduce((a, s) => a + s.mocks, 0);
          return (
            <a
              key={g.id}
              href={`/${section.id}/${g.id}`}
              className="paper-card"
              style={{ "--i": i }}
            >
              <span className="paper-eyebrow">{T.streamEyebrow}</span>
              <h3 className="paper-title">{bi(lang, g.name, g.nameHi, true)}</h3>
              <div className="paper-foot">
                <div className="paper-counts">
                  <span>
                    <b>{g.subjects.length}</b> {T.wSubjects(g.subjects.length)}
                  </span>
                  <span>
                    <b>{nf(total)}</b> {T.wQuestions(total)}
                  </span>
                  <span>
                    <b>{mocks}</b> {T.wMocks(mocks)}
                  </span>
                </div>
                <span className="paper-cta">{T.openStream}</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
