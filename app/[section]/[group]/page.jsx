import { notFound } from "next/navigation";
import { getManifest, findSection, findGroup } from "@/lib/data";
import Breadcrumb from "@/components/Breadcrumb";
import BackLink from "@/components/BackLink";
import SubjectGrid from "@/components/SubjectGrid";

export default async function GroupPage({ params }) {
  const manifest = await getManifest();
  const section = findSection(manifest, params.section);
  const group = findGroup(section, params.group);
  if (!section || !group) notFound();

  return (
    <div>
      <BackLink href={`/${section.id}`} label={section.name} />
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: section.name, href: `/${section.id}` },
          { label: group.name },
        ]}
      />
      <h1 className="page-title">{group.name}</h1>
      <p className="page-sub">Pick a subject to see its mock papers.</p>
      <SubjectGrid sectionId={section.id} groupId={group.id} subjects={group.subjects} />
    </div>
  );
}
