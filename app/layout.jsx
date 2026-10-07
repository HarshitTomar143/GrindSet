import "./globals.css";
import ThemeControls from "@/components/ThemeControls";
import LangSwitch from "@/components/LangSwitch";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { getSiteLang } from "@/lib/site-lang-server";
import { htmlLang } from "@/lib/site-lang";
import { uiText } from "@/lib/ui-text";
import { getAccount } from "@/lib/auth";
import AccountButton from "@/components/AccountButton";
import { SITE_URL } from "@/lib/site-url";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  // "./" resolves against each page's own path, so every page gets a canonical
  // link to itself with any query string dropped.
  alternates: { canonical: "./" },
  title: {
    default: "Octopus · Teaching exam practice",
    template: "%s · Octopus",
  },
  applicationName: "Octopus",
  description:
    "Timed mock papers built from previous-year questions for UP TET, CTET and UP TGT / PGT, scored the moment you submit.",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#7d6fd1",
};

const themeInit = `(function(){try{
var d=document.documentElement;
var t=localStorage.getItem('theme'); if(t)d.setAttribute('data-theme',t);
var f=localStorage.getItem('fontScale'); if(f)d.setAttribute('data-font',f);
}catch(e){}})();`;

export default async function RootLayout({ children }) {
  const lang = getSiteLang();
  const T = uiText(lang);
  const account = await getAccount();

  return (
    // themeInit stamps data-theme/data-font on <html> before hydration.
    <html lang={htmlLang(lang)} data-lang={lang} suppressHydrationWarning>
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
                <img src="/octopus-mark.png" alt="" width="40" height="40" />
              </span>
              <span className="brand-text">
                <span>Octopus</span>
                <span className="brand-sub">{T.brandSub}</span>
              </span>
            </a>
            <div className="header-actions">
              <LangSwitch lang={lang} label={T.siteLanguage} />
              <ThemeControls lang={lang} />
              <AccountButton account={account} T={T} />
            </div>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="footer-inner">
            <div className="footer-line">{T.footerLine}</div>
            <div className="footer-links">
              <a href="/uptet">UP TET</a>
              <a href="/ctet">CTET</a>
              <a href="/up-tgt-pgt">UP TGT / PGT</a>
              <a href="/mp-police">MP Police</a>
              <a href="/admin">{T.admin}</a>
            </div>
          </div>
        </footer>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
