# Charis · AI Fashion Agent

A production-grade, **mobile-first** chat UI for a fashion shopping agent. Built with **Vite + React + TypeScript + Tailwind + shadcn/ui**.

```
user prompt → Groq Responses API → fashion-explore MCP → Groq → UI
```

A small backend (`server/index.js`) holds all secrets and makes the Groq call; the frontend only ever
talks to `/api/chat`. In production the same server also serves the built frontend — one process.

## Quick start

```bash
npm install
cp .env.example .env      # then fill in GROQ_API_KEY and MCP_AUTH_TOKEN
npm run dev               # web on :5173, API on :8787
```

`npm run dev` runs both the Vite frontend **and** the backend together. The frontend calls
`/api/chat`, which Vite proxies to the backend (`server/index.js`) — that's where the Groq call
to the fashion-explore MCP happens. No secrets ever reach the browser.

> Want the UI without a backend? Leave `VITE_API_URL` empty and `src/lib/api.ts` falls back to a
> built-in stub so you can see the full experience offline.

## Where the keys go

All secrets live in `.env` (gitignored, **server-side only**):

| Var | What |
| --- | --- |
| `GROQ_API_KEY` | Your Groq key — https://console.groq.com/keys |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` |
| `GROQ_MODEL` | `openai/gpt-oss-120b` (any tool-use model) |
| `MCP_URL` | `https://fashion-mcp.droidvm.dev/mcp` |
| `MCP_AUTH_TOKEN` | Bearer token for the MCP server |
| `PORT` | Backend port (default `8787`) |

⚠️ Never give these a `VITE_` prefix and never put them in frontend code — `VITE_*` vars are bundled
into the browser. Only `VITE_API_URL` (just the path `/api/chat`) is a frontend var.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Frontend + backend together (HMR + `--watch`) |
| `npm run dev:web` | Frontend only |
| `npm run dev:api` | Backend only |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run start` | Run the production server (serves `dist/` + API) |
| `npm run preview` | Preview the static build (Vite) |
| `npm run lint` | ESLint |

## Deploy to production

The app ships as a **single Node process**: once `dist/` exists, `server/index.js` serves the built
frontend *and* the `/api/chat` endpoint.

```bash
npm ci
npm run build
npm start          # serves on :8787  (set PORT to change)
```

Provide the same env vars (`GROQ_API_KEY`, `MCP_AUTH_TOKEN`, …) via your platform's secret manager —
no `.env` file needed in prod (the server reads `process.env` directly).

### Docker

```bash
docker build -t charis .
docker run -p 8787:8787 \
  -e GROQ_API_KEY=... \
  -e MCP_AUTH_TOKEN=... \
  charis
```

Works as-is on Railway, Render, Fly.io, a VPS, or any container host.

### Vercel (recommended)

The repo is Vercel-ready: the frontend deploys as a static Vite build and `/api/chat` runs as a
serverless function (`api/chat.js`) — both share `server/chat-core.js`. `vercel.json` sets the
build, bakes in `VITE_API_URL=/api/chat`, and raises the function timeout to 60s (Groq + MCP turns
take ~10–20s; Hobby caps at 60s).

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new) (it auto-detects Vite).
2. In **Project → Settings → Environment Variables**, add the secrets (these are NOT in the repo):

   | Variable | Required | Notes |
   | --- | --- | --- |
   | `GROQ_API_KEY` | ✅ | Your Groq key |
   | `MCP_AUTH_TOKEN` | ➖ | Bearer token for the MCP (if its auth is on) |
   | `GROQ_MODEL` | ➖ | Defaults to `openai/gpt-oss-120b` |
   | `MCP_URL` | ➖ | Defaults to the fashion-explore URL |
   | `POSTHOG_API_KEY` | ➖ | Enables analytics; omit to disable |

3. Deploy. Charis is live, frontend + API on one domain.

> The fashion-explore MCP must be publicly reachable from Vercel's servers (it is, via the
> Cloudflare tunnel) — see the auth/DNS note in the MCP docs if you switch profiles.

### Mobile

The UI is mobile-first: `100dvh` layout, safe-area insets for notches/home-bars, 16px inputs (no iOS
zoom), large touch targets, and the agent returns **vertical product cards** (not wide tables) so
phones never scroll sideways. Add it to a home screen and it behaves like an app.

## Wiring up Groq + MCP

The flow is already wired:

```
src/lib/api.ts      sendMessage(history) → POST /api/chat        (frontend)
server/index.js     /api/chat → Groq Responses API + MCP tool     (backend)
```

**`server/index.js`** is the only thing that touches secrets. It calls:

```jsonc
POST {GROQ_BASE_URL}/responses          // e.g. https://api.groq.com/openai/v1/responses
Authorization: Bearer {GROQ_API_KEY}
{
  "model": "openai/gpt-oss-120b",
  "instructions": "<fashion agent system prompt>",
  "input": messages,
  "tools": [{
    "type": "mcp",
    "server_label": "fashion-explore",
    "server_url": "https://fashion-mcp.droidvm.dev/mcp",
    "server_description": "Read-only access to Klydo's fashion catalog DB...",
    "headers": { "Authorization": "Bearer {MCP_AUTH_TOKEN}" },
    "require_approval": "never"
  }]
}
```

It then extracts the final assistant text and returns `{ "content": "..." }`. The UI renders that
as Markdown (tables, links, images), so the system prompt asks the model to format products nicely.

To customise behaviour, edit `SYSTEM_PROMPT` in `server/index.js`. To swap the model, set
`GROQ_MODEL` in `.env`.

## Project layout

```
server/index.js       ⭐ backend: /api/chat → Groq Responses API + MCP (holds secrets)
src/
  lib/api.ts          frontend client → POST /api/chat (stub fallback if no VITE_API_URL)
  hooks/useChat.ts    chat state (messages, loading, error)
  types/chat.ts       shared types
  components/
    ui/               shadcn primitives
    chat/             ChatPanel, MessageList, MessageBubble, ChatInput, Markdown, TypingIndicator
  App.tsx · main.tsx · index.css
```

## About the MCP

`fashion-explore` is a read-only MCP server over Klydo's `fashion-agent` Postgres DB
(`catalog_products`, `price_history`, brands, sources, ~209k products). It exposes typed SQL tools
(`execute_sql`, `run_registered_query`, …). The model picks the right tools per query; this UI just
renders the synthesized answer.
