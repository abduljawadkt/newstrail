# Deployment Guide — NewsTrail

## Required environment variables

| Key | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon pooled URL works). |
| `NEXTAUTH_SECRET` | Strong random secret: `openssl rand -base64 32`. **Never reuse the dev value.** |
| `NEXTAUTH_URL` | Public site URL, e.g. `https://newstrail.example.com`. |
| `APP_URL` | Same public URL (used for payment callbacks, emails, sitemap). |
| `EASEBUZZ_ENV` | `mock` (demo), `test`, or `prod`. |
| `EASEBUZZ_KEY` / `EASEBUZZ_SALT` | From your Easebuzz dashboard (test or prod). |

After deploy, set `NEXTAUTH_URL` and `APP_URL` to the real domain and redeploy.

## Database setup on a fresh environment
```bash
npm run db:push     # create tables
npm run db:seed     # optional demo data
```

## ⚠️ Important: file storage & serverless

Uploaded page images, PDF-split pages, and cropped clippings are written to
`public/uploads/` on the **local filesystem**. This works on a server/VPS with a
persistent disk, but **NOT on serverless platforms** (Vercel/Netlify) where the
filesystem is read-only and ephemeral — PDF upload, image upload, and crop
download will fail there.

Two supported paths:

### A) VPS / container (recommended — works as-is)
Railway, Render, Fly.io, a DigitalOcean droplet, etc.
```bash
npm ci
npm run build
npm run start        # serves on PORT (default 3000)
```
Mount a **persistent volume** at `public/uploads` so uploads survive redeploys.
PDF processing (sharp + pdf-to-img) has no execution-time limit here.

### B) Vercel (needs object storage first)
Vercel can host the app, but you must move uploads off local disk to
**Vercel Blob** (or S3/R2/Cloudinary) before upload/crop features work, and be
aware of function time limits for large-PDF processing (10s Hobby / 60s Pro).
The upload routes in `src/app/api/**` are the only places that touch the disk.

## Health check
`GET /api/health` returns `{ status: "ok", db: "up" }` when the DB is reachable
(503 otherwise) — use it for uptime/readiness probes.

## Production checklist
- [ ] Strong `NEXTAUTH_SECRET`
- [ ] `EASEBUZZ_ENV=prod` with live keys (and verify callback URL is public)
- [ ] Persistent storage for `public/uploads` (or object storage)
- [ ] Wire a real email provider in `src/lib/email.ts` for password reset
- [ ] Change/remove the seeded demo accounts (`admin@`/`reader@newstrail.in`)
- [ ] Point a domain and set `NEXTAUTH_URL` / `APP_URL`
