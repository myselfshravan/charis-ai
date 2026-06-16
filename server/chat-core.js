import "dotenv/config";
import { PostHog } from "posthog-node";

/* ────────────────────────────────────────────────────────────────────────
 * Framework-agnostic chat core — the single place the Groq + fashion-explore
 * MCP call lives. Used by BOTH:
 *   - server/index.js   (local dev: long-running Express server)
 *   - api/chat.js       (production: Vercel serverless function)
 *
 * Secrets are read from the environment and NEVER sent to the browser.
 * ──────────────────────────────────────────────────────────────────────── */

const {
  GROQ_API_KEY,
  GROQ_BASE_URL = "https://api.groq.com/openai/v1",
  MCP_URL = "https://fashion-mcp.droidvm.dev/mcp",
  MCP_AUTH_TOKEN,
  POSTHOG_API_KEY,
  POSTHOG_HOST = "https://us.i.posthog.com",
} = process.env;

export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
export const MCP_SERVER_URL = MCP_URL;
export const HAS_MCP_AUTH = Boolean(MCP_AUTH_TOKEN);

// Analytics runs only in production (e.g. Vercel) with a key set — so local dev
// never blocks on, or logs, PostHog network errors. Set POSTHOG_LOCAL=1 to
// force it on locally. Fail-fast options keep it from ever stalling a request.
export const analyticsEnabled =
  Boolean(POSTHOG_API_KEY) &&
  (process.env.NODE_ENV === "production" || process.env.POSTHOG_LOCAL === "1");

export const posthog = analyticsEnabled
  ? new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      enableExceptionAutocapture: true,
      flushAt: 1,
      fetchRetryCount: 0,
      requestTimeout: 3000,
    })
  : null;

function capture(event) {
  posthog?.capture(event);
}

/**
 * Flush queued events — important in serverless before the function freezes.
 * Bounded by a timeout so an unreachable PostHog never delays a chat response.
 */
export async function flushAnalytics() {
  if (!posthog) return;
  try {
    await Promise.race([posthog.flush(), new Promise((resolve) => setTimeout(resolve, 2500))]);
  } catch {
    /* analytics is best-effort */
  }
}

const SYSTEM_PROMPT = `You are Charis, Klydo's AI fashion shopping assistant for end users.
Use the fashion-explore MCP tools to query the live catalog (products, prices,
brands) and answer with real data. ALWAYS call the tools before answering —
never answer from memory or make up data.

OUTPUT FORMAT:
- For a list of shoppable PRODUCTS: one short friendly sentence, then a single
  fenced \`\`\`json array. Keys per object: name (string), brand (string|null),
  price (number, in ₹), original_price (number|null), discount_pct (integer|null),
  image (string image URL|null), url (string product page URL|null). Nothing
  after the json block.
- For ANYTHING ELSE — counts, brand/category splits, comparisons, trends,
  follow-ups — reply in plain concise Markdown. Use a Markdown TABLE or list for
  structured data. NEVER put non-product data inside a json block.

STRICT RULES:
- Use ONLY data the tools returned. NEVER invent products, prices, images, URLs,
  or numbers, and NEVER use placeholder URLs like example.com. Use null when missing.
- NEVER expose internal implementation details: do not mention database tables
  or columns, SQL, tool/function names, the MCP, or how you fetched the data.
  Speak only in plain shopping language about products, brands, prices, and trends.
- If a request is ambiguous (e.g. just "where"), ask one short clarifying
  question instead of guessing or dumping data.
- "Trending" means currently in-stock items for that brand with the biggest
  discounts or the newest additions.
- Prices are in ₹. Keep the tone friendly and fashion-savvy.`;

const mcpTool = {
  type: "mcp",
  server_label: "fashion-explore",
  server_url: MCP_URL,
  server_description:
    "Read-only access to Klydo's fashion catalog database. Find products, compare prices, " +
    "and surface deals and trends across brands.",
  require_approval: "never",
  ...(MCP_AUTH_TOKEN ? { headers: { Authorization: `Bearer ${MCP_AUTH_TOKEN}` } } : {}),
};

/** Pull the final assistant text out of a Responses API payload. */
function extractContent(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }
  const parts = [];
  for (const item of data.output ?? []) {
    if (item.type !== "message" || item.role !== "assistant") continue;
    for (const c of item.content ?? []) {
      if (typeof c.text === "string") parts.push(c.text);
      else if (typeof c.output_text === "string") parts.push(c.output_text);
    }
  }
  return parts.join("\n").trim();
}

/** Did the model fake products instead of using the catalog tools? */
function isFabricated(content, usedTools) {
  if (!content) return false;
  if (/example\.com/i.test(content)) return true; // never appears in real catalog data
  if (content.includes("```json") && !usedTools) return true; // "products" with no tool call
  return false;
}

/** One call to Groq's Responses API. */
async function requestGroq(messages) {
  const res = await fetch(`${GROQ_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      instructions: SYSTEM_PROMPT,
      input: messages,
      tools: [mcpTool],
    }),
  });
  const data = await res.json();
  const usedTools = Array.isArray(data.output) && data.output.some((i) => i.type === "mcp_call");
  return { ok: res.ok, status: res.status, data, usedTools };
}

/**
 * Run one chat turn. Returns { status, json } — framework-agnostic so the
 * caller just forwards it to its response object.
 */
export async function handleChat(messages, { distinctId } = {}) {
  if (!GROQ_API_KEY) {
    return { status: 500, json: { error: "Server misconfigured: GROQ_API_KEY is not set." } };
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return { status: 400, json: { error: "Body must be { messages: [{ role, content }] }." } };
  }

  capture({
    distinctId,
    event: "chat message sent",
    properties: { message_count: messages.length, model: GROQ_MODEL },
  });

  try {
    let res = await requestGroq(messages);
    let content = res.ok ? extractContent(res.data) : "";

    // Retry once if the model botched its tool calls, or fabricated products
    // (parroted the format instead of querying the catalog tools).
    const shouldRetry =
      (!res.ok && res.data?.error?.code === "tool_use_failed") ||
      (res.ok && isFabricated(content, res.usedTools));
    if (shouldRetry) {
      res = await requestGroq(messages);
      content = res.ok ? extractContent(res.data) : "";
    }

    if (!res.ok) {
      console.error("Groq error:", JSON.stringify(res.data));
      const message = res.data?.error?.message ?? `Groq request failed (${res.status}).`;
      capture({
        distinctId,
        event: "chat error",
        properties: {
          error_type: res.data?.error?.code ?? "groq_api_error",
          status_code: res.status,
          error_message: message,
          model: GROQ_MODEL,
        },
      });
      return { status: 502, json: { error: friendlyError(res.data) } };
    }

    if (isFabricated(content, res.usedTools)) {
      console.error("Fabricated response (no tool call / example.com):", content.slice(0, 200));
      capture({
        distinctId,
        event: "chat error",
        properties: { error_type: "fabricated_response", model: GROQ_MODEL },
      });
      return {
        status: 502,
        json: { error: "I couldn't pull live results from the catalog just now. Please try again." },
      };
    }

    if (!content) {
      capture({
        distinctId,
        event: "chat error",
        properties: { error_type: "empty_response", model: GROQ_MODEL },
      });
      return { status: 502, json: { error: "Groq returned no assistant text." } };
    }

    capture({
      distinctId,
      event: "chat response received",
      properties: { model: GROQ_MODEL, response_length: content.length, message_count: messages.length },
    });

    return { status: 200, json: { content } };
  } catch (err) {
    console.error("Server error:", err);
    posthog?.captureException(err, distinctId, { model: GROQ_MODEL });
    return { status: 500, json: { error: "Failed to reach Groq. Check the server logs." } };
  }
}

/** User-facing message — surface a hint when the model botched tool calls. */
function friendlyError(data) {
  if (data?.error?.code === "tool_use_failed") {
    return "The model had trouble using the catalog tools. Please try again — or switch GROQ_MODEL to openai/gpt-oss-120b for more reliable tool use.";
  }
  return data?.error?.message ?? "Something went wrong. Please try again.";
}
