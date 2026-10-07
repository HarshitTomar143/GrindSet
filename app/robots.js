import { SITE_URL } from "@/lib/site-url";

// Mock papers and the sign-in pages are kept out of search with a noindex tag
// on the page itself, so they stay crawlable here: a crawler has to be able to
// fetch a page to see that tag.
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/account"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
