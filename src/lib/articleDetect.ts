import Anthropic from "@anthropic-ai/sdk";

/**
 * AI article-region detection for a newspaper page image.
 * Uses Claude vision to return a tight bounding box (as page fractions) and
 * headline for each distinct news article. Requires ANTHROPIC_API_KEY.
 */

export type DetectedArticle = {
  headline: string;
  category: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
};

const MODEL = "claude-opus-5";

const PROMPT = `You are analyzing a full newspaper page image.

Identify each distinct NEWS ARTICLE on the page. For every article return:
- "headline": the main headline text of that article (plain text)
- "category": a short section label if obvious (e.g. "Nation", "City", "Sports"), else null
- a TIGHT bounding box that covers the whole article — its headline, body text, and any photo that clearly belongs to it — expressed as fractions of the page:
  - "x": left edge (0 = far left, 1 = far right)
  - "y": top edge (0 = top, 1 = bottom)
  - "w": width as a fraction
  - "h": height as a fraction

Rules:
- Skip advertisements, the newspaper nameplate/masthead, page-number/date strips, and pure decorative elements.
- Boxes may not overlap heavily; each article gets ONE box.
- Coordinates must satisfy 0 ≤ x, y ≤ 1 and x+w ≤ 1 and y+h ≤ 1.

Return ONLY a JSON array, no prose, no code fences. Example:
[{"headline":"Council clears new budget","category":"City","x":0.05,"y":0.14,"w":0.45,"h":0.22}]`;

export function articleDetectionAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function clamp01(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export async function detectArticles(jpeg: Buffer): Promise<DetectedArticle[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  const client = new Anthropic();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: "You are a precise newspaper layout analyzer. You only output JSON.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") },
          },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  // Extract the JSON array even if the model added stray characters.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: DetectedArticle[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const x = clamp01(o.x);
    const y = clamp01(o.y);
    let w = clamp01(o.w);
    let h = clamp01(o.h);
    if (x + w > 1) w = 1 - x;
    if (y + h > 1) h = 1 - y;
    if (w < 0.03 || h < 0.03) continue; // ignore tiny/degenerate boxes
    const headline = typeof o.headline === "string" ? o.headline.trim().slice(0, 300) : "";
    if (!headline) continue;
    const category =
      typeof o.category === "string" && o.category.trim() ? o.category.trim().slice(0, 60) : null;
    out.push({ headline, category, x, y, w, h });
  }
  return out;
}
