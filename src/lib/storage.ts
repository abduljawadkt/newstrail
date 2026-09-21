import fs from "node:fs/promises";
import path from "node:path";

/**
 * Storage abstraction with two drivers, selected by STORAGE_DRIVER:
 *   - "local" (default): files under /public/uploads, served by Next static.
 *   - "s3": any S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2…).
 *
 * The database stores a "public path" like "/uploads/<epaperId>/page-1.jpg".
 * Callers use putObject/getBytes/deletes with that path; the UI uses assetSrc()
 * to turn it into an <img src>. Switching hosts = changing env vars only.
 */

const DRIVER = (process.env.STORAGE_DRIVER || "local").toLowerCase();
const isS3 = DRIVER === "s3";

const PUBLIC_ROOT = path.join(process.cwd(), "public");
const keyOf = (publicPath: string) => publicPath.replace(/^\//, ""); // strip leading slash

/** Build the canonical public path stored in the DB. */
export function publicPathFor(epaperId: string, fileName: string) {
  return `/uploads/${epaperId}/${fileName}`;
}

/** Convert a stored public path into a browser <img src>. */
export function assetSrc(publicPath: string) {
  if (!publicPath) return publicPath;
  if (/^https?:\/\//.test(publicPath)) return publicPath; // already absolute
  if (isS3) {
    const base = (process.env.S3_PUBLIC_URL || "").replace(/\/$/, "");
    return `${base}${publicPath}`;
  }
  return publicPath; // local: served from /public
}

// ---- S3 client (lazy) ----
let _client: import("@aws-sdk/client-s3").S3Client | null = null;
async function s3() {
  if (_client) return _client;
  const { S3Client } = await import("@aws-sdk/client-s3");
  _client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
  return _client;
}
const bucket = () => process.env.S3_BUCKET || "";

// ---- write ----
export async function putObject(publicPath: string, body: Buffer, contentType: string) {
  if (isS3) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await s3()).send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: keyOf(publicPath),
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return;
  }
  const abs = path.join(PUBLIC_ROOT, keyOf(publicPath));
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, body);
}

// ---- read ----
export async function getBytes(publicPath: string): Promise<Buffer> {
  if (isS3) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const res = await (await s3()).send(
      new GetObjectCommand({ Bucket: bucket(), Key: keyOf(publicPath) })
    );
    const chunks: Buffer[] = [];
    // @ts-expect-error Node stream
    for await (const c of res.Body) chunks.push(Buffer.from(c));
    return Buffer.concat(chunks);
  }
  return fs.readFile(path.join(PUBLIC_ROOT, keyOf(publicPath)));
}

// ---- delete ----
export async function deleteByPublicPath(publicPath: string) {
  if (isS3) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await s3())
      .send(new DeleteObjectCommand({ Bucket: bucket(), Key: keyOf(publicPath) }))
      .catch(() => {});
    return;
  }
  await fs.rm(path.join(PUBLIC_ROOT, keyOf(publicPath)), { force: true }).catch(() => {});
}

/** Delete every object for an edition (used on replace / delete edition). */
export async function deleteEpaper(epaperId: string) {
  if (isS3) {
    const { ListObjectsV2Command, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3();
    const prefix = `uploads/${epaperId}/`;
    const list = await client
      .send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix }))
      .catch(() => null);
    for (const obj of list?.Contents ?? []) {
      if (obj.Key) {
        await client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: obj.Key })).catch(() => {});
      }
    }
    return;
  }
  await fs.rm(path.join(PUBLIC_ROOT, "uploads", epaperId), { recursive: true, force: true }).catch(() => {});
}
