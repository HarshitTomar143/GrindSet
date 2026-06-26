import "./globals.css";

export const metadata = {
  title: "Octopus",
  applicationName: "Octopus",
  description: "Octopus — practice mock papers for UPTET Paper 1 & Paper 2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
        />
      </head>
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
