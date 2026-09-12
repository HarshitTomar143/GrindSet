"use client";

/**
 * Jump links for a subject with many syllabus units. A subject like Hindi runs
 * to seven units and thirty-five chapters, which is a long way to scroll to
 * reach vyakaran; these put every unit one click away and stay out of the way
 * on subjects short enough not to need them.
 */
export default function UnitNav({ units, label }) {
  if (units.length < 3) return null;

  return (
    <nav className="unit-nav" aria-label={label}>
      {units.map((u, i) => (
        <a
          key={u.id}
          href={`#unit-${u.id}`}
          onClick={(e) => {
            e.preventDefault();
            document
              .getElementById(`unit-${u.id}`)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          <span className="unit-nav-num">{i + 1}</span>
          {u.name}
          <span className="unit-nav-count">{u.count}</span>
        </a>
      ))}
    </nav>
  );
}
