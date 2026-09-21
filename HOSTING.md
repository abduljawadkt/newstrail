# Free Hosting Guide — NewsTrail

A $0/month stack that runs the full app (PDF splitting, image processing, uploads,
payments, auth):

| Layer | Service | Free tier |
|---|---|---|
| Database | **Neon** (Postgres) | Yes — already set up |
| File storage | **Cloudflare R2** | 10 GB storage, **no egress fees** |
| App (compute) | **Render** (Docker web service) | Yes (sleeps when idle, 512 MB RAM) |

> Free-tier caveats: Render free **sleeps after ~15 min idle** (first hit ~30–50s
> cold start) and has **512 MB RAM** (very large broadsheet PDFs may run out of
> memory while splitting). For a daily production paper, upgrade Render to
> **Starter (~$7/mo)** — no sleep, more RAM — or use a small VPS. Everything below
> stays the same; only the `plan:` changes.

---

## Step 1 — Cloudflare R2 (file storage)

1. Sign up / log in at **dash.cloudflare.com** → **R2**.
2. **Create bucket** → name it `newstrail`.
3. Enable public access: bucket → **Settings** → **Public Development URL** →
   **Enable**. Copy the URL, e.g. `https://pub-xxxxxxxx.r2.dev` — this is
   `S3_PUBLIC_URL`. (For production, connect a custom domain instead.)
4. Create an API token: R2 → **Manage R2 API Tokens** → **Create API token** →
   permission **Object Read & Write**, scoped to the `newstrail` bucket. Copy:
   - **Access Key ID** → `S3_ACCESS_KEY_ID`
   - **Secret Access Key** → `S3_SECRET_ACCESS_KEY`
5. Your endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` → `S3_ENDPOINT`
   (Account ID is shown on the R2 overview page.)

You now have: `S3_ENDPOINT`, `S3_BUCKET=newstrail`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`, and `S3_REGION=auto`.

## Step 2 — Database (Neon)

Already provisioned. Copy the **pooled** connection string from the Neon dashboard →
this is `DATABASE_URL`. (Tables already exist; for a brand-new DB run
`npm run db:push` locally against it once.)

## Step 3 — Deploy on Render

1. Go to **dashboard.render.com** → **New +** → **Blueprint**.
2. Connect GitHub and pick **`abduljawadkt/newstrail`**. Render reads `render.yaml`.
3. It creates a Docker web service. Fill in the env vars it asks for (the ones
   marked `sync:false`):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled URL |
   | `NEXTAUTH_URL` | `https://<your-service>.onrender.com` (set after first deploy) |
   | `APP_URL` | same as `NEXTAUTH_URL` |
   | `S3_ENDPOINT` | from R2 |
   | `S3_BUCKET` | `newstrail` |
   | `S3_ACCESS_KEY_ID` | from R2 |
   | `S3_SECRET_ACCESS_KEY` | from R2 |
   | `S3_PUBLIC_URL` | R2 public URL |
   | `EASEBUZZ_KEY` / `EASEBUZZ_SALT` | your keys (or leave, `EASEBUZZ_ENV=mock`) |

   `NEXTAUTH_SECRET` is auto-generated; `STORAGE_DRIVER=s3` and `S3_REGION=auto`
   are already set in the blueprint.
4. **Create** → first build runs (Docker). It may take a few minutes.
5. After it's live, copy the `onrender.com` URL, set `NEXTAUTH_URL` and `APP_URL`
   to it, and **Manual Deploy → Deploy latest** (or just save — Render redeploys).
6. Create your admin user — easiest is to run the seed once locally against the
   production DB **with the R2 vars set**, so demo images land in R2:
   ```bash
   # in a local shell, .env pointing at prod DATABASE_URL + STORAGE_DRIVER=s3 + R2 vars
   npm run db:seed
   ```
   Then log in at `/login` as `admin@newstrail.in` / `admin123` and **change the
   password** (or create a fresh admin and delete the demo one).

## Step 4 (optional) — Cloudflare in front (CDN + custom domain)

Point your domain's DNS through Cloudflare and add it to Render as a custom domain.
R2 images can also be served from a custom domain for caching. This gives free SSL
and global caching of page images.

---

## Verifying it works
- `GET /api/health` → `{ "status": "ok", "db": "up" }`
- Admin → **Upload edition** → pick a real newspaper PDF → it splits into pages,
  and the images are stored in your R2 bucket (check the bucket contents).
- Open the edition as a reader: page 1 free, pages 2+ prompt to subscribe.

## Switching back to local disk (VPS/Docker with a volume)
Set `STORAGE_DRIVER=local` and mount a persistent volume at `public/uploads`.
Nothing else changes.

## Cost summary
- Neon: free
- Cloudflare R2: free up to 10 GB (no egress)
- Render: free (with sleep) or ~$7/mo (always-on, recommended for daily use)
