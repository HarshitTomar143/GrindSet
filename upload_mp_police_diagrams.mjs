// Upload the MP Police diagrams in ./seed_data_mp_police/diagrams to Cloudflare R2.
// Usage: node upload_mp_police_diagrams.mjs [--dry-run]   (after `python build_mp_police_data.py`)
//
// The object key of every image is fixed by the build (diagram_map.json), and
// that same key is what seed_mp_police.mjs writes into the database, so the
// question -> picture pairing decided at build time cannot drift here: this
// script only moves bytes. Keys end in a content hash, so a re-run skips what
// is already there and a changed picture gets a new URL instead of a stale cache.

import { readFile } from "fs/promises";
import { createHash } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

dotenv.config({ path: ".env.local" });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.join(__dirname, "seed_data_mp_police");
const DRY_RUN = process.argv.includes("--dry-run");

const REQUIRED = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length && !DRY_RUN) {
  console.error(`Missing in .env.local: ${missing.join(", ")}. See .env.example.`);
  process.exit(1);
}

const publicBase = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
const md5 = (buf) => createHash("md5").update(buf).digest("hex");

async function main() {
  const map = JSON.parse(await readFile(path.join(SEED_DIR, "diagram_map.json"), "utf-8"));

  // Re-check the files on disk against the build's record before sending anything.
  const files = [];
  for (const d of map) {
    const body = await readFile(path.join(SEED_DIR, "diagrams", d.key));
    if (md5(body) !== d.md5) {
      throw new Error(`${d.key} no longer matches diagram_map.json - rerun build_mp_police_data.py`);
    }
    files.push({ ...d, body });
  }
  console.log(`${files.length} diagrams checked against diagram_map.json.`);
  if (DRY_RUN) {
    console.log("Dry run: nothing uploaded.");
    return;
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  const Bucket = process.env.R2_BUCKET;

  let uploaded = 0;
  let skipped = 0;
  for (const f of files) {
    let exists = false;
    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket, Key: f.key }));
      exists = head.ContentLength === f.bytes;
    } catch (e) {
      if (e?.$metadata?.httpStatusCode !== 404 && e?.name !== "NotFound") throw e;
    }
    if (exists) {
      skipped++;
    } else {
      await s3.send(
        new PutObjectCommand({
          Bucket,
          Key: f.key,
          Body: f.body,
          ContentType: "image/png",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
      uploaded++;
    }
    process.stdout.write(`\rUploaded ${uploaded}, already present ${skipped} / ${files.length}`);
  }
  console.log();

  // Read every object back through the public URL: the database will hold
  // these URLs, so they have to resolve for a browser, not just for the API.
  let bad = 0;
  for (const f of files) {
    const url = `${publicBase}/${f.key}`;
    const res = await fetch(url);
    const got = res.ok ? md5(Buffer.from(await res.arrayBuffer())) : null;
    if (got !== f.md5) {
      bad++;
      console.error(`FAILED ${url} (${res.ok ? "content differs" : `HTTP ${res.status}`})`);
    }
  }
  if (bad) {
    throw new Error(`${bad} diagram(s) are not readable at R2_PUBLIC_URL - is the bucket's public access / custom domain enabled?`);
  }
  console.log(`All ${files.length} diagrams are publicly readable under ${publicBase}/`);
}

main().catch((e) => {
  console.error("\nUpload failed:", e.message);
  process.exit(1);
});
