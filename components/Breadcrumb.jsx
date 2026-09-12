// "›" rather than "/": in the two-language mode a label itself reads
// "हिन्दी / Hindi", and a slash between crumbs would blur into it.
export default function Breadcrumb({ items }) {
  return (
    <nav className="breadcrumb">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && <span className="sep">›</span>}{" "}
          {it.href ? <a href={it.href}>{it.label}</a> : <span>{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}
