import "dotenv/config";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { setupExpressErrorHandler, setupExpressRequestContext } from "posthog-node";
import { GROQ_MODEL, HAS_MCP_AUTH, MCP_SERVER_URL, handleChat, posthog } from "./chat-core.js";

/* ────────────────────────────────────────────────────────────────────────
 * Local dev server. Wraps the shared chat core (server/chat-core.js) in an
 * Express app, and also serves the built frontend (dist/) so `npm start`
 * runs the whole app as one process. On Vercel this file isn't used — the
 * frontend is served statically and /api/chat runs as a serverless function
 * (api/chat.js), both backed by the same chat core.
 * ──────────────────────────────────────────────────────────────────────── */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;

if (!process.env.GROQ_API_KEY) {
  console.error("✘ GROQ_API_KEY is not set. Add it to .env (see .env.example).");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));
if (posthog) setupExpressRequestContext(posthog, app);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/chat", async (req, res) => {
  const distinctId = req.headers["x-posthog-distinct-id"] || randomUUID();
  const { status, json } = await handleChat(req.body?.messages, { distinctId });
  res.status(status).json(json);
});

// Serve the built frontend in production (single-process deploy).
const distDir = path.resolve(__dirname, "../dist");
const servesFrontend = fs.existsSync(distDir);
if (servesFrontend) {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

if (posthog) setupExpressErrorHandler(posthog, app);

app.listen(PORT, () => {
  console.log(`✓ Charis API on http://localhost:${PORT}`);
  console.log(`  model:     ${GROQ_MODEL}`);
  console.log(`  mcp:       ${MCP_SERVER_URL}${HAS_MCP_AUTH ? " (auth on)" : " (no auth token)"}`);
  console.log(`  analytics: ${posthog ? "PostHog on" : "off (POSTHOG_API_KEY unset)"}`);
  console.log(`  frontend:  ${servesFrontend ? "serving dist/" : "not built (dev mode — use Vite)"}`);
});

const shutdown = async () => {
  await posthog?.shutdown();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
