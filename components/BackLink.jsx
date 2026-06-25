export default function BackLink({ href, label = "Back" }) {
  return (
    <a href={href} className="back-btn">
      ← {label}
    </a>
  );
}
