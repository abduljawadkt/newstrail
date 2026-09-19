# NewsTrail E-Paper

Digital newspaper (e-paper) platform for **NewsTrail India** — page-flip viewer, article clipping,
edition/date archive, user accounts, subscriptions (Easebuzz) and an admin back-office.

Built with **Next.js 14 (App Router) · TypeScript · PostgreSQL · Prisma · Tailwind · NextAuth · Easebuzz**.

## Prerequisites
- Node.js 18+ (tested on Node 22)
- PostgreSQL — via Docker (recommended) or a local/hosted instance

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres (Docker)
npm run docker:up          # or use Neon/Supabase and set DATABASE_URL in .env

# 3. Copy env and adjust if needed
cp .env.example .env

# 4. Create the database schema
npm run db:push

# 5. Seed demo data (edition, admin, plans, sample e-papers with images)
npm run db:seed

# 6. Run the dev server
npm run dev
```

Open http://localhost:3000

### Demo logins
- **Admin:**  `admin@newstrail.in` / `admin123`
- **Reader:** `reader@newstrail.in` / `reader123`

## Payments (Easebuzz)
Set `EASEBUZZ_KEY`, `EASEBUZZ_SALT`, and `EASEBUZZ_ENV` (`test` or `prod`) in `.env`.
Get these from your Easebuzz dashboard. Do **not** commit real keys.

## Project layout
- `prisma/schema.prisma` — data model
- `prisma/seed.ts` — demo data + placeholder page image generator
- `src/app` — pages (App Router) and API routes
- `src/components` — shared UI
- `src/lib` — prisma client, auth, easebuzz helpers
- `public/uploads` — generated/uploaded page images (gitignored)

## Build phases
- [x] Phase 0 — scaffold, schema, branding shell, archive grid, seed
- [x] Phase 1 — auth (register/login/profile + route guards)
- [x] Phase 2 — e-paper viewer + article view
- [x] Phase 3 — admin (edition upload + article region mapper + plans + users)
- [x] Phase 4 — plans + Easebuzz subscription flow + paywall (+ local mock gateway)
- [x] Phase 5 — search, saved clips, header search, polish

## Payment modes
`EASEBUZZ_ENV` in `.env`:
- `mock` (default in dev) — simulates the gateway locally, no keys needed. Great for demos.
- `test` — real Easebuzz test gateway (needs test `EASEBUZZ_KEY` / `EASEBUZZ_SALT`).
- `prod` — live gateway.
