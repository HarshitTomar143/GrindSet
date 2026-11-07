import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2, server side only. The admin's browser uploads PDFs straight
 * to the bucket through a short-lived signed PUT URL, so a large file never
 * passes through a serverless function (and its request-size limit). Reads
 * work the same way: a signed GET, which also lets us choose whether the
 * browser shows the file (inline) or saves it (attachment).
 *
 * The bucket needs a CORS rule for the site's origin — `npm run r2:cors`.
 */

const REQUIRED = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];

export function r2Configured() {
  return REQUIRED.every((k) => !!process.env[k]);
}

let client;
function s3() {
  if (!r2Configured()) {
    throw new Error(`R2 is not configured. Set ${REQUIRED.join(", ")} in your env file.`);
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      // Otherwise the SDK signs a checksum of an empty body into presigned
      // PUT URLs, and the real upload is then rejected as a mismatch.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

const Bucket = () => process.env.R2_BUCKET;

/** A URL the browser can PUT exactly this file to, for the next 15 minutes. */
export function signedUploadUrl(key, { contentType, size }) {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: Bucket(), Key: key, ContentType: contentType, ContentLength: size }),
    { expiresIn: 15 * 60 }
  );
}

/** A short-lived GET URL; `download` makes the browser save it as `fileName`. */
export function signedReadUrl(key, { download = false, fileName = "document.pdf", expiresIn = 15 * 60 } = {}) {
  // RFC 6266: plain ASCII fallback plus the UTF-8 name, so Hindi names survive.
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "");
  const disposition = `${download ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: Bucket(),
      Key: key,
      ResponseContentDisposition: disposition,
      ResponseContentType: "application/pdf",
    }),
    { expiresIn }
  );
}

export async function deleteObject(key) {
  await s3().send(new DeleteObjectCommand({ Bucket: Bucket(), Key: key }));
}
