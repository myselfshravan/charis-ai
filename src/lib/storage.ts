import type { ChatSession } from "@/types/chat";

/**
 * Chat history persistence — per device/browser via localStorage.
 * Bump the version suffix if the ChatSession shape changes incompatibly.
 */
const KEY = "charis_sessions_v1";

export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    // Defensive: only keep well-formed sessions.
    return data.filter(
      (s): s is ChatSession =>
        s && typeof s.id === "string" && Array.isArray(s.messages),
    );
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch {
    /* quota exceeded or storage unavailable — non-fatal */
  }
}
