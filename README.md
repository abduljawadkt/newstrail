# NewsTrail E-Paper

Full-stack digital newspaper (e-paper) platform for **NewsTrail India** — a page-by-page
reader with article clipping, an admin back-office (upload full-PDF editions that auto-split
into pages, map article regions), user accounts, and Easebuzz subscriptions with a paywall.

**Stack:** Next.js 14 (App Router) · TypeScript · PostgreSQL (Neon) · Prisma · NextAuth ·
Tailwind CSS · sharp · pdf-to-img · Easebuzz.

## Features

**Readers**
- Archive homepage with **date + edition filter**
- Page-flip **viewer** (edition tabs, date picker, page dropdown, zoom, thumbnails, hide-pages)
- **Crop tool** — download any region of a page (subscribers)
- **Single-article extraction** — click a mapped headline → cropped clipping with a News ID + download
- Full-text **search**, saved **clips**
- Account area: profile, change password, current plan, subscription history
- **Forgot/reset password** flow

**Paywall:** page 1 is a free preview for every edition; pages 2+ require an active
subscription. Admins have full access.

**Admin (`/admin`)**
- Dashboard (users, editions, active subscriptions, revenue)
- **Upload a full newspaper PDF → auto-split into pages** (or upload page images)
- Publish date defaults to tomorrow; supports the last 3 months to a week ahead
- Visual **article-region mapper**, per-page delete, replace-all-pages
- Manage plans, view users & subscriptions

**Payments:** Easebuzz hosted checkout with SHA-512 request hashing and verified
callbacks. A local **mock** mode lets you demo the full flow without keys.

## Getting started

```bash
# 1. Install
npm install

# 2. Database (choose one)
#    - Docker:  npm run docker:up
#    - Neon/Supabase: paste the connection string into .env
cp .env.example .env        # then edit values

# 3. Schema + demo data
npm run db:push
npm run db:seed

# 4. Run
npm run dev                 # http://localhost:3000
```

### Demo logins
- **Admin:**  `admin@newstrail.in` / `admin123`
- **Reader:** `reader@newstrail.in` / `reader123`

> Change or remove these before production.

## Environment
See [`.env.example`](.env.example). `DATABASE_URL` and `NEXTAUTH_SECRET` are required;
the app logs a clear error if they're missing.

## Deployment
See [`DEPLOYMENT.md`](DEPLOYMENT.md). **Note:** uploads are written to `public/uploads`
on local disk — deploy on a VPS/container with a persistent volume, or move storage to
Vercel Blob/S3 before deploying to serverless.

## Project layout
- `prisma/schema.prisma` — data model · `prisma/seed.ts` — demo data + image generator
- `src/app` — pages & API routes (App Router)
- `src/components` — UI (viewer, admin, account)
- `src/lib` — prisma, auth, session, subscription, easebuzz, storage helpers, env, rate-limit
- `public/uploads` — generated/uploaded page images (gitignored)

## Security & hardening
- All `/api/admin/*` routes require an admin session; middleware guards `/admin`, `/profile`, `/clips`
- Payment callbacks are hash-verified before granting access
- Password reset uses hashed, expiring, single-use tokens
- Rate limiting on register / forgot-password; security headers set in `next.config.js`
- Upload size/type validation on image and PDF ingestion
- Health probe at `GET /api/health`
