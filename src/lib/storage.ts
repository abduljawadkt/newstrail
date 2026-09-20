import fs from "node:fs/promises";
import path from "node:path";

/**
 * Single place that maps upload keys to disk locations and public URLs.
 *
 * Today this is a local-filesystem driver (writes under /public/uploads).
 * To run on serverless (Vercel etc.), swap the write/read/remove functions
 * here for an object-storage driver (Vercel Blob, S3, R2) — callers only use
 * these helpers, so nothing else needs to change.
 */

const PUBLIC_ROOT = path.join(process.cwd(), "public");

export function uploadDir(epaperId: string) {
  return path.join(PUBLIC_ROOT, "uploads", epaperId);
}

export function publicUrl(epaperId: string, fileName: string) {
  return `/uploads/${epaperId}/${fileName}`;
}

/** Resolve a stored public path (e.g. "/uploads/x/page-1.jpg") to an absolute FS path. */
export function fsPathFromPublic(publicPath: string) {
  return path.join(PUBLIC_ROOT, publicPath.replace(/^\//, ""));
}

export async function ensureUploadDir(epaperId: string) {
  const dir = uploadDir(epaperId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function removeUploadDir(epaperId: string) {
  await fs.rm(uploadDir(epaperId), { recursive: true, force: true }).catch(() => {});
}

export async function removePublicFile(publicPath: string) {
  await fs.rm(fsPathFromPublic(publicPath), { force: true }).catch(() => {});
}
