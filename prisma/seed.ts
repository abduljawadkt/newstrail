import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Build an SVG that looks like a newspaper page, then rasterize with sharp. */
function pageSvg(pageNumber: number, dateLabel: string, width = 1000, height = 1400) {
  const headline =
    pageNumber === 1
      ? "Police nix CJP-type anti-quota stir plan"
      : `Page ${pageNumber} — City &amp; Nation`;
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#f7f4ef"/>
    <rect x="0" y="0" width="100%" height="130" fill="#ffffff"/>
    <line x1="40" y1="130" x2="${width - 40}" y2="130" stroke="#9a1750" stroke-width="3"/>
    <text x="48" y="150" font-family="Georgia, serif" font-size="20" fill="#555">${dateLabel} · Page ${pageNumber}</text>
    <text x="48" y="230" font-family="Georgia, serif" font-size="44" font-weight="bold" fill="#111">${headline}</text>
    ${Array.from({ length: 22 })
      .map(
        (_, i) =>
          `<line x1="48" y1="${290 + i * 34}" x2="${width - 48}" y2="${
            290 + i * 34
          }" stroke="#c9c4bb" stroke-width="6"/>`
      )
      .join("")}
    <rect x="${width - 360}" y="300" width="312" height="220" fill="#e7e2d8" stroke="#c9c4bb"/>
    <text x="${width - 204}" y="420" font-family="Georgia, serif" font-size="20"
          text-anchor="middle" fill="#8a8577">Photo</text>
  </svg>`;
}

const LOGO_PATH = path.join(process.cwd(), "public", "logo.png");

async function makePageImages(epaperFolder: string, pageNumber: number, dateLabel: string) {
  ensureDir(epaperFolder);
  const svg = Buffer.from(pageSvg(pageNumber, dateLabel));
  const fullName = `page-${pageNumber}.png`;
  const thumbName = `page-${pageNumber}-thumb.png`;

  // Composite the official NewsTrail logo as the page nameplate.
  const logoWidth = 320;
  const logo = await sharp(LOGO_PATH).resize({ width: logoWidth }).png().toBuffer();
  const logoMeta = await sharp(logo).metadata();
  const composited = await sharp(svg)
    .composite([{ input: logo, top: 30, left: Math.round((1000 - logoWidth) / 2) }])
    .png()
    .toBuffer();
  void logoMeta;

  await sharp(composited).png().toFile(path.join(epaperFolder, fullName));
  await sharp(composited).resize(400).png().toFile(path.join(epaperFolder, thumbName));
  return { fullName, thumbName };
}

async function main() {
  ensureDir(UPLOAD_DIR);

  // --- Admin user ---
  const adminPass = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@newstrail.in" },
    update: {},
    create: {
      name: "NewsTrail Admin",
      email: "admin@newstrail.in",
      passwordHash: adminPass,
      role: "ADMIN",
    },
  });

  // --- Demo reader ---
  const readerPass = await bcrypt.hash("reader123", 10);
  await prisma.user.upsert({
    where: { email: "reader@newstrail.in" },
    update: {},
    create: {
      name: "Demo Reader",
      email: "reader@newstrail.in",
      passwordHash: readerPass,
      role: "READER",
    },
  });

  // --- Edition ---
  const edition = await prisma.edition.upsert({
    where: { slug: "india" },
    update: {},
    create: { name: "India", slug: "india", language: "English" },
  });

  // --- Plans ---
  const plans = [
    { name: "Monthly", priceInPaise: 9900, durationDays: 30, features: "Full access to all editions for 30 days" },
    { name: "Quarterly", priceInPaise: 24900, durationDays: 90, features: "3 months access + article clipping" },
    { name: "Annual", priceInPaise: 79900, durationDays: 365, features: "Best value — 12 months full access" },
  ];
  for (const p of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: p.name } });
    if (!existing) await prisma.plan.create({ data: p });
  }

  // --- Sample e-papers for the last 4 days ---
  const today = new Date();
  for (let d = 0; d < 4; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    date.setHours(0, 0, 0, 0);

    const dateLabel = date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const epaper = await prisma.ePaper.upsert({
      where: { editionId_publishDate: { editionId: edition.id, publishDate: date } },
      update: { status: "PUBLISHED" },
      create: { editionId: edition.id, publishDate: date, status: "PUBLISHED" },
    });

    const folder = path.join(UPLOAD_DIR, epaper.id);
    const publicBase = `/uploads/${epaper.id}`;

    const numPages = 4;
    let coverThumb: string | null = null;
    for (let pn = 1; pn <= numPages; pn++) {
      const { fullName, thumbName } = await makePageImages(folder, pn, dateLabel);
      if (pn === 1) coverThumb = `${publicBase}/${thumbName}`;

      const page = await prisma.page.upsert({
        where: { epaperId_pageNumber: { epaperId: epaper.id, pageNumber: pn } },
        update: {},
        create: {
          epaperId: epaper.id,
          pageNumber: pn,
          fullImage: `${publicBase}/${fullName}`,
          thumbImage: `${publicBase}/${thumbName}`,
          width: 1000,
          height: 1400,
        },
      });

      // Add sample mapped articles on page 1 of the newest edition
      if (pn === 1 && d === 0) {
        const existing = await prisma.article.count({ where: { pageId: page.id } });
        if (existing === 0) {
          await prisma.article.create({
            data: {
              pageId: page.id,
              headline: "Police nix CJP-type anti-quota stir plan",
              body:
                "Prohibitory orders have been imposed across the state after authorities moved to prevent a planned anti-quota agitation modelled on the CJP-style protest. Officials said the decision was taken to maintain public order...",
              category: "Top Story",
              clipX: 0.048,
              clipY: 0.14,
              clipW: 0.62,
              clipH: 0.12,
            },
          });
          await prisma.article.create({
            data: {
              pageId: page.id,
              headline: "KPSC 'scam': ED raids IAS officer's residence",
              body:
                "The Enforcement Directorate carried out searches at the residence of a senior IAS officer in connection with the alleged KPSC recruitment scam. The agency said documents and digital devices were seized...",
              category: "Nation",
              clipX: 0.70,
              clipY: 0.20,
              clipW: 0.26,
              clipH: 0.10,
            },
          });
        }
      }
    }

    await prisma.ePaper.update({ where: { id: epaper.id }, data: { coverThumb } });
    console.log(`Seeded edition India for ${dateLabel} (${numPages} pages)`);
  }

  console.log("\nSeed complete.");
  console.log("Admin login:  admin@newstrail.in / admin123");
  console.log("Reader login: reader@newstrail.in / reader123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
