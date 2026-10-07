// The site's own public address, with no trailing slash. Canonical links, the
// sitemap and robots.txt are all built on it, so in production it must be the
// one domain the site should be known by. SITE_URL wins; NEXTAUTH_URL is the
// same address and is already set wherever sign-in works.
const raw =
  process.env.SITE_URL ||
  process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SITE_URL = raw.replace(/\/+$/, "");

export function absoluteUrl(path = "/") {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}
