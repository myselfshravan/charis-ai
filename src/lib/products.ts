import type { Product } from "@/types/chat";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatINR(n: number): string {
  return `₹${inr.format(Math.round(n))}`;
}

/** Resolve the discount %, preferring the model's value, else deriving it. */
export function discountPct(p: Product): number | null {
  if (typeof p.discount_pct === "number" && p.discount_pct > 0) return Math.round(p.discount_pct);
  if (p.price != null && p.original_price != null && p.original_price > p.price) {
    return Math.round((1 - p.price / p.original_price) * 100);
  }
  return null;
}

export interface ParsedReply {
  text: string;
  products: Product[];
}

/**
 * The agent returns prose + an optional ```json fenced block of products.
 * Split them so prose renders as markdown and products render as cards.
 * Falls back to plain text if there's no valid block.
 */
export function parseReply(content: string): ParsedReply {
  const match = content.match(/```json\s*([\s\S]*?)```/i);
  if (!match) return { text: content.trim(), products: [] };

  try {
    const parsed = JSON.parse(match[1].trim());
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { products?: unknown }).products)
        ? (parsed as { products: unknown[] }).products
        : null;

    // Only treat the block as products if every item is product-shaped (has a
    // name). Non-product json (e.g. a brand/count split) is left in the text so
    // its data is never silently dropped.
    if (arr && arr.every((p) => p && typeof (p as Product).name === "string")) {
      return { text: content.replace(match[0], "").trim(), products: arr as Product[] };
    }
    return { text: content.trim(), products: [] };
  } catch {
    return { text: content.trim(), products: [] };
  }
}
