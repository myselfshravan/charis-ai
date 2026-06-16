import type { ChatResult, ChatTurn } from "@/types/chat";

/* ────────────────────────────────────────────────────────────────────────
 * ⭐ GROQ INTEGRATION POINT
 *
 * The flow this UI is built for:
 *
 *   user prompt → Groq Responses API → fashion-explore MCP → Groq → UI
 *
 * `sendMessage` is the ONLY thing the UI knows about the backend. Keep its
 * signature stable and you can swap implementations freely.
 *
 * ── Why a backend is required ──────────────────────────────────────────
 * Both the Groq API key AND the fashion-explore MCP bearer token are
 * secrets. They must NEVER ship to the browser. So `sendMessage` should
 * POST to a small server endpoint you own (e.g. /api/chat), and THAT
 * endpoint makes the Groq call below. Until you build it, leave
 * VITE_API_URL empty and the UI runs against the stub at the bottom.
 *
 * ── What your backend endpoint should do ───────────────────────────────
 * Receive { messages: ChatTurn[] } and call Groq's Responses API:
 *
 *   POST https://api.groq.com/openai/v1/responses
 *   Authorization: Bearer <GROQ_API_KEY>
 *   {
 *     "model": "openai/gpt-oss-120b",
 *     "input": messages,                  // role/content turns
 *     "instructions": "<fashion agent system prompt>",
 *     "tools": [{
 *       "type": "mcp",
 *       "server_label": "fashion-explore",
 *       "server_url": "https://fashion-mcp.droidvm.dev/mcp",
 *       "server_description":
 *         "Read-only access to Klydo's fashion catalog DB (catalog_products, \
 *          price_history, brands, sources). Use to find products, compare \
 *          prices, surface deals and trends across brands.",
 *       "headers": { "Authorization": "Bearer <MCP_AUTH_TOKEN>" },
 *       "require_approval": "never"
 *     }]
 *   }
 *
 * Then return { content } where `content` is the final assistant text
 * (response.output → last `message` item's `output_text`). Markdown is
 * rendered as-is in the UI, so have the model format products/tables nicely.
 * ──────────────────────────────────────────────────────────────────────── */

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

/** Stable anonymous id so PostHog counts real users, not one per request. */
function distinctId(): string {
  const KEY = "charis_did";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export async function sendMessage(
  history: ChatTurn[],
  signal?: AbortSignal,
): Promise<ChatResult> {
  if (!API_URL) return stubReply(history, signal);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-posthog-distinct-id": distinctId(),
    },
    body: JSON.stringify({ messages: history }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Request failed (${res.status}). ${await res.text().catch(() => "")}`.trim());
  }

  const data = (await res.json()) as Partial<ChatResult>;
  if (typeof data.content !== "string") {
    throw new Error("Malformed response: expected { content: string }.");
  }
  return { content: data.content };
}

/* Dev-only fallback so the UI is fully runnable before Groq is wired. */
async function stubReply(history: ChatTurn[], signal?: AbortSignal): Promise<ChatResult> {
  await delay(1400, signal);
  const last = history[history.length - 1]?.content ?? "your search";
  const products = [
    { name: "Oversized Cotton Tee", brand: "Snitch", price: 899, original_price: 1299, discount_pct: 31, image: "https://picsum.photos/seed/charis1/400/520", url: "https://www.example.com" },
    { name: "Relaxed Linen Shirt", brand: "Rare Rabbit", price: 2499, original_price: 3499, discount_pct: 29, image: "https://picsum.photos/seed/charis2/400/520", url: "https://www.example.com" },
    { name: "Wide-Leg Trousers", brand: "Zara", price: 2990, original_price: null, discount_pct: null, image: "https://picsum.photos/seed/charis3/400/520", url: "https://www.example.com" },
    { name: "Knit Polo Sweater", brand: "H&M", price: 1799, original_price: 2299, discount_pct: 22, image: "https://picsum.photos/seed/charis4/400/520", url: "https://www.example.com" },
  ];
  return {
    content: `Here are a few picks for "${last}" _(demo data — set \`VITE_API_URL\` for live results)_:\n\n\`\`\`json\n${JSON.stringify(products)}\n\`\`\``,
  };
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}
