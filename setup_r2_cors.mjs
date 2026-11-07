/**
 * One-time: lets the site's pages talk to the R2 bucket from the browser.
 *   - PUT  — the admin panel uploads PDFs straight to R2
 *   - GET  — the PDF viewer (pdf.js) reads them, in ranges for big files
 *
 *   npm run r2:cors
 *
 * Origins come from SITE_URL and NEXTAUTH_URL plus local dev ports. Add more
 * with R2_CORS_ORIGINS=https://a.example,https://b.example.
 *
 * The R2 token needs "Admin Read & Write" to change bucket settings. With an
 * object-only token this fails; set the same rule in the Cloudflare dashboard
 * instead (R2 -> bucket -> Settings -> CORS policy) — the JSON is printed below.
 */
import dotenv from "dotenv";
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

dotenv.config({ path: ".env.local" });
dotenv.config();

const REQUIRED = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing ${missing.join(", ")} — see .env.example.`);
  process.exit(1);
}

// The live site is always included, so a rerun can never drop it by accident.
const origins = new Set([
  "https://www.octopus.ind.in",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
]);
for (const v of [process.env.SITE_URL, process.env.NEXTAUTH_URL, ...(process.env.R2_CORS_ORIGINS || "").split(",")]) {
  const o = (v || "").trim().replace(/\/+$/, "");
  if (!o) continue;
  origins.add(o);
  // Cover both the bare domain and www.
  try {
    const u = new URL(o);
    if (!/^localhost$|^\d/.test(u.hostname)) {
      origins.add(`${u.protocol}//${u.hostname.startsWith("www.") ? u.hostname.slice(4) : `www.${u.hostname}`}`);
    }
  } catch {}
}

const rule = {
  AllowedOrigins: [...origins],
  AllowedMethods: ["GET", "HEAD", "PUT"],
  AllowedHeaders: ["*"],
  ExposeHeaders: ["Content-Length", "Content-Range", "Accept-Ranges", "ETag"],
  MaxAgeSeconds: 3600,
};

console.log("CORS rule:\n" + JSON.stringify([rule], null, 2));

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

try {
  await s3.send(new PutBucketCorsCommand({ Bucket: process.env.R2_BUCKET, CORSConfiguration: { CORSRules: [rule] } }));
  console.log(`\nApplied to bucket "${process.env.R2_BUCKET}".`);
} catch (e) {
  console.error(`\nCould not apply it (${e.name}: ${e.message}).`);
  console.error("Paste the JSON above into Cloudflare -> R2 -> your bucket -> Settings -> CORS policy.");
  process.exit(1);
}
