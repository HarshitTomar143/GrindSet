import "./globals.css";

export const metadata = {
  title: "UPTET Mock Test",
  description: "Practice mock papers for UPTET Paper 1 & Paper 2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/" className="brand">
            <span className="brand-mark">UP</span>
            <span>UPTET Mock Test</span>
          </a>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          Practice papers · 30 questions each · scored at the end
        </footer>
      </body>
    </html>
  );
}
