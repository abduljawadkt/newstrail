# ---- deps ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- build ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Dummy env so `next build` can run without live services
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
ENV NEXTAUTH_SECRET="build-time-placeholder"
RUN npm run build

# ---- runtime ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# System libs: openssl (Prisma), poppler-utils (pdftoppm PDF->image), fontconfig (fonts)
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates poppler-utils fontconfig && rm -rf /var/lib/apt/lists/*

# Full dependency tree so native + dynamically-imported modules
# (sharp, pdf-to-img, @napi-rs/canvas, @aws-sdk/client-s3, prisma engine) are present.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "run", "start"]
