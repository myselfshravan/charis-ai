import { randomUUID } from "node:crypto";
import { flushAnalytics, handleChat } from "../server/chat-core.js";

// Groq + MCP turns take ~10–20s; bump the function timeout above Vercel's
// default. (Hobby plan caps at 60s.)
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const messages = req.body?.messages;
  const distinctId = req.headers["x-posthog-distinct-id"] || randomUUID();

  const { status, json } = await handleChat(messages, { distinctId });

  // Flush analytics before the serverless function freezes, else events drop.
  await flushAnalytics();

  return res.status(status).json(json);
}
