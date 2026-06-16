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

const SYSTEM_PROMPT = `You are Charis, Klydo's AI fashion shopping assistant.
Use the fashion-explore MCP tools to query the live product catalog
(catalog_products, price_history, brands, sources) and answer with real data.

WHEN YOU RETURN PRODUCTS, reply with exactly:
1. One short, friendly sentence (no headings).
2. A single fenced \`\`\`json code block containing an ARRAY of the products you found.
   Each object has these keys:
     - name           (string)
     - brand          (string or null)
     - price          (number, in ₹)
     - original_price (number or null)
     - discount_pct   (integer or null)
     - image          (string image URL or null)
     - url            (string product page URL or null)
3. Nothing after the json block.

Example:
Here are some great black tees under ₹1500:
\`\`\`json
[{"name":"Oversized Cotton Tee","brand":"Snitch","price":899,"original_price":1299,"discount_pct":31,"image":"https://...","url":"https://..."}]
\`\`\`

FOR NON-PRODUCT answers (trends, comparisons, follow-up questions), reply in
plain concise Markdown WITHOUT a json block.

RULES:
- Never invent products, prices, images, or URLs — only report tool results; use null when unknown.
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
  return { ok: res.ok, status: res.status, data: await res.json() };
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
    // Some models intermittently emit malformed tool calls; one retry usually fixes it.
    if (!res.ok && res.data?.error?.code === "tool_use_failed") {
      res = await requestGroq(messages);
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

    const content = extractContent(res.data);
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
