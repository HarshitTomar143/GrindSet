import { promises as fs } from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "public", "data");

export async function getManifest() {
  const raw = await fs.readFile(path.join(dataDir, "manifest.json"), "utf-8");
  return JSON.parse(raw);
}

export function findSection(manifest, sectionId) {
  return manifest.sections.find((s) => s.id === sectionId) || null;
}

export function findGroup(section, groupId) {
  return section?.groups.find((g) => g.id === groupId) || null;
}

export function findSubject(group, subjectId) {
  return group?.subjects.find((s) => s.id === subjectId) || null;
}
