import "./globals.css";
import ThemeControls from "@/components/ThemeControls";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import WelcomeModal from "@/components/WelcomeModal";

export const metadata = {
  title: "Octopus",
  applicationName: "Octopus",
  description: "Octopus — practice mock papers for UPTET Paper 1 & Paper 2",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#7d6fd1",
};

// Apply saved theme/font before first paint to avoid a flash.
const themeInit = `(function(){try{
var d=document.documentElement;
var t=localStorage.getItem('theme'); if(t)d.setAttribute('data-theme',t);
var f=localStorage.getItem('fontScale'); if(f)d.setAttribute('data-font',f);
}catch(e){}})();`;

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
        <link rel="apple-touch-icon" href="/pwa-icon.svg" />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <header className="site-header">
          <div className="header-inner">
            <a href="/" className="brand">
              <span className="brand-mark logo-mark">
                <img src="/octopus.png" alt="Octopus Prep logo" />
              </span>
              <span>Octopus</span>
            </a>
            <ThemeControls />
          </div>
        </header>
        <WelcomeModal />
        <main className="container">{children}</main>
        <footer className="site-footer">
          Practice papers · 30 questions each · scored at the end ·{" "}
          <a href="/admin" style={{ textDecoration: "underline" }}>
            Admin
          </a>
        </footer>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
