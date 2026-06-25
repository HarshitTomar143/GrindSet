import "./globals.css";

export const metadata = {
  title: "Octopus",
  applicationName: "Octopus",
  description: "Octopus — practice mock papers for UPTET Paper 1 & Paper 2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/" className="brand">
            <span className="brand-mark">🐙</span>
            <span>Octopus</span>
          </a>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          Practice papers · 30 questions each · scored at the end ·{" "}
          <a href="/admin" style={{ textDecoration: "underline" }}>
            Admin
          </a>
        </footer>
      </body>
    </html>
  );
}
