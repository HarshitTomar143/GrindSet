import "./globals.css";
import ThemeControls from "@/components/ThemeControls";
import LangSwitch from "@/components/LangSwitch";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Analytics from "@/components/Analytics";
import { getSiteLang } from "@/lib/site-lang-server";
import { htmlLang } from "@/lib/site-lang";
import { uiText } from "@/lib/ui-text";
import { getAccount } from "@/lib/auth";
import AccountButton from "@/components/AccountButton";
import { SITE_URL } from "@/lib/site-url";
import { SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, OG_BASE, TWITTER_BASE, siteJsonLd, JsonLd } from "@/lib/seo";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  // "./" resolves against each page's own path, so every page gets a canonical
  // link to itself with any query string dropped.
  alternates: { canonical: "./" },
  title: {
    default: `${SITE_NAME} · ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  applicationName: SITE_NAME,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  // Pages that set their own title and description override these two; the
  // share image is in OG_BASE.
  openGraph: {
    ...OG_BASE,
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    ...TWITTER_BASE,
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  // Ownership proofs for Google Search Console and Bing Webmaster Tools, set
  // in the environment once each tool hands out its code.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
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
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <JsonLd data={siteJsonLd()} />
      </head>
      <body>
        <header className="site-header">
          <div className="header-inner">
            <a href="/" className="brand">
              {/* The logo carries the wordmark, so no separate name beside it. */}
              <span className="brand-logo">
                <img src="/Updated.png" alt="PYQSetu" width="1543" height="1019" />
              </span>
              <span className="brand-text">
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
        <Analytics />
      </body>
    </html>
  );
}
