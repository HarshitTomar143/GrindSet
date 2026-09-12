import { notFound } from "next/navigation";
import { getManifest, findSection, findGroup } from "@/lib/data";
import { uiText } from "@/lib/ui-text";
import { bi } from "@/lib/site-lang";
import { getSiteLang } from "@/lib/site-lang-server";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";
import SubjectGrid from "@/components/SubjectGrid";

export default async function GroupPage({ params }) {
  const lang = getSiteLang();
  const T = uiText(lang);
  const manifest = await getManifest();
  const section = findSection(manifest, params.section);
  const group = findGroup(section, params.group);
  if (!section || !group) notFound();

  const sectionName = bi(lang, section.name, section.nameHi, true);
  const groupName = bi(lang, group.name, group.nameHi, true);

  return (
    <div data-exam="uptet">
      <BackLink href={`/${section.id}`} label={sectionName} />
      <Breadcrumb
        items={[
          { label: T.home, href: "/" },
          { label: "UP TET", href: "/uptet" },
          { label: sectionName, href: `/${section.id}` },
          { label: groupName },
        ]}
      />
      <h1 className="page-title">{groupName}</h1>
      <p className="page-sub">{T.subSubjects}</p>
      <SubjectGrid
        sectionId={section.id}
        groupId={group.id}
        subjects={group.subjects}
        lang={lang}
      />
    </div>
  );
}
