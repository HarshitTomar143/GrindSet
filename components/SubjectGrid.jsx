export default function SubjectGrid({ sectionId, groupId, subjects }) {
  return (
    <div className="grid">
      {subjects.map((s, i) => (
        <a
          key={s.id}
          href={`/${sectionId}/${groupId}/${s.id}`}
          className="card"
          style={{ "--i": i }}
        >
          <div className="card-title">{s.name}</div>
          <div className="card-meta">{s.total} questions</div>
          <span className="pill">
            {s.mocks} mock paper{s.mocks > 1 ? "s" : ""}
          </span>
        </a>
      ))}
    </div>
  );
}
