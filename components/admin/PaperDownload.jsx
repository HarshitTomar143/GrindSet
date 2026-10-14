"use client";

import { useEffect, useState } from "react";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "mock-paper";
}

export async function downloadMockPaperAsJson(test) {
  try {
    const manifestRes = await fetch("/api/manifest");
    const manifest = await manifestRes.json();
    if (manifest.error) throw new Error(manifest.error);

    const section = manifest.sections.find((s) => s.name === test.section_name);
    const group = section?.groups.find((g) =>
      g.subjects.some((s) => s.name === test.subject_name)
    );
    const subject = group?.subjects.find((s) => s.name === test.subject_name);

    if (!section || !group || !subject) {
      throw new Error("Could not find this mock paper in the manifest.");
    }

    const res = await fetch(
      `/api/quiz?section=${section.id}&group=${group.id}&subject=${subject.id}&mock=${test.mock_num}`
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const payload = {
      section: section.name,
      group: group.name,
      subject: subject.name,
      mock: test.mock_num,
      questions: (data.questions || []).map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correct,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(section.name)}-${slugify(group.name)}-${slugify(subject.name)}-mock-${test.mock_num}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert(e.message || "Failed to download mock paper.");
  }
}

// Pick any UP TET paper from the tree and save it as JSON.
export default function PaperDownload() {
  const [manifest, setManifest] = useState(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [expandedSubject, setExpandedSubject] = useState(null);

  useEffect(() => {
    if (!downloadOpen || manifest) return;
    fetch("/api/manifest")
      .then((r) => r.json())
      .then((m) => !m.error && setManifest(m))
      .catch(() => {});
  }, [downloadOpen, manifest]);

  return (
    <div style={{ marginBottom: 24 }}>
      <button type="button" className="btn ghost" onClick={() => setDownloadOpen((open) => !open)}>
        Download a paper (JSON)
      </button>
        {downloadOpen && manifest && (
          <div
            style={{
              marginTop: 16,
              border: "1px solid rgba(120, 130, 170, 0.24)",
              borderRadius: 14,
              padding: 16,
            }}
          >
            {manifest.sections.map((section) => (
              <div key={section.id} style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setExpandedSection((current) =>
                      current === section.id ? null : section.id
                    );
                    setExpandedGroup(null);
                    setExpandedSubject(null);
                  }}
                >
                  {section.name}
                </button>
                {expandedSection === section.id && (
                  <div style={{ marginLeft: 16, marginTop: 12 }}>
                    {section.groups.map((group) => (
                      <div key={group.id} style={{ marginBottom: 14 }}>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            setExpandedGroup((current) =>
                              current === group.id ? null : group.id
                            );
                            setExpandedSubject(null);
                          }}
                        >
                          {group.name}
                        </button>
                        {expandedGroup === group.id && (
                          <div style={{ marginLeft: 16, marginTop: 12 }}>
                            {group.subjects.map((subject) => {
                              const subjectKey = `${section.id}|${group.id}|${subject.id}`;
                              return (
                                <div key={subject.id} style={{ marginBottom: 12 }}>
                                  <button
                                    type="button"
                                    className="btn ghost"
                                    onClick={() =>
                                      setExpandedSubject((current) =>
                                        current === subjectKey ? null : subjectKey
                                      )
                                    }
                                  >
                                    {subject.name}
                                  </button>
                                  {expandedSubject === subjectKey && (
                                    <div
                                      style={{
                                        marginLeft: 16,
                                        marginTop: 12,
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                                        gap: 8,
                                      }}
                                    >
                                      {Array.from({ length: subject.mocks }, (_, index) => (
                                        <button
                                          key={index}
                                          type="button"
                                          className="btn ghost"
                                          onClick={() =>
                                            downloadMockPaperAsJson({
                                              section_id: section.id,
                                              group_id: group.id,
                                              subject_id: subject.id,
                                              section_name: section.name,
                                              group_name: group.name,
                                              subject_name: subject.name,
                                              mock_num: index + 1,
                                            })
                                          }
                                        >
                                          Mock {index + 1}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
