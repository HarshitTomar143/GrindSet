import Script from "next/script";

// Google Analytics 4 and Microsoft Clarity. Each one loads only when its ID is
// set, so local dev and preview builds send nothing. The IDs are read on the
// server at request time: changing them needs a restart, not a rebuild.
const GA_ID = process.env.GA_MEASUREMENT_ID;
const CLARITY_ID = process.env.CLARITY_PROJECT_ID;

// Only letters, digits, dashes: the IDs are pasted into inline scripts.
const safe = (id) => (id && /^[A-Za-z0-9-]+$/.test(id) ? id : null);

export default function Analytics() {
  const ga = safe(GA_ID);
  const clarity = safe(CLARITY_ID);

  return (
    <>
      {ga && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${ga}');`}
          </Script>
        </>
      )}
      {clarity && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window,document,"clarity","script","${clarity}");`}
        </Script>
      )}
    </>
  );
}
