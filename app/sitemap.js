import { absoluteUrl } from "@/lib/site-url";
import { BANKS, getTopics } from "@/lib/banks";
import { getManifest } from "@/lib/data";

export const dynamic = "force-dynamic";

// The papers whose section page links a full-length mock chooser.
const FULL_MOCK_SECTIONS = ["paper1", "paper2"];

/**
 * Every page worth finding in search: the home page, each exam, and each
 * paper, subject and topic under it. Mock papers themselves are left out —
 * they are noindex. The lists come from the database, so a newly seeded topic
 * appears here without anything being edited.
 */
export default async function sitemap() {
  const entries = [];
  const add = (path, priority, changeFrequency = "weekly") =>
    entries.push({ url: absoluteUrl(path), changeFrequency, priority });

  add("/", 1, "daily");

  // UP TET reads the `questions` table and lives at the URL root.
  add("/uptet", 0.9);
  try {
    const manifest = await getManifest();
    for (const sec of manifest.sections) {
      add(`/${sec.id}`, 0.8);
      const multiGroup = sec.groups.length > 1;
      if (!multiGroup && FULL_MOCK_SECTIONS.includes(sec.id)) {
        add(`/${sec.id}/${sec.groups[0].id}/${sec.id}-full`, 0.8);
      }
      for (const g of sec.groups) {
        if (multiGroup) add(`/${sec.id}/${g.id}`, 0.7);
        for (const s of g.subjects) add(`/${sec.id}/${g.id}/${s.id}`, 0.6);
      }
    }
  } catch (e) {
    // An unseeded exam must not take the whole sitemap down with it.
    console.error("sitemap: UP TET skipped —", e.message);
  }

  for (const bank of BANKS) {
    add(bank.base, 0.9);
    for (const section of bank.sections) {
      add(`${bank.base}/${section.id}`, 0.8);
      try {
        const topics = await getTopics(section);
        for (const t of topics) add(`${bank.base}/${section.id}/${t.id}`, 0.6);
      } catch (e) {
        console.error(`sitemap: ${bank.id}/${section.id} skipped —`, e.message);
      }
    }
  }

  return entries;
}
