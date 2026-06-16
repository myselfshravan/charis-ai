import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { sendMessage } from "@/lib/api";
import { loadSessions, saveSessions } from "@/lib/storage";
import type { ChatSession, Message } from "@/types/chat";

const newId = () => crypto.randomUUID();

function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "New chat";
  return t.length > 42 ? `${t.slice(0, 42)}…` : t;
}

const byRecent = (a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt;

/**
 * Session-aware chat store. Each "New chat" is a fresh session with its own
 * id; all sessions persist to localStorage (per device/browser). The single
 * source of truth for messages, history browsing, and CRUD.
 */
export function useSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  // Restore the most recent session on load; null = a fresh, unsaved chat.
  const [currentId, setCurrentId] = useState<string | null>(() => {
    const initial = loadSessions().sort(byRecent);
    return initial[0]?.id ?? null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => saveSessions(sessions), [sessions]);

  const ordered = useMemo(() => [...sessions].sort(byRecent), [sessions]);
  const current = currentId ? (sessions.find((s) => s.id === currentId) ?? null) : null;
  const messages = current?.messages ?? [];

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isLoading) return;

      // Generate ids OUTSIDE the state updater so it stays pure (StrictMode-safe).
      const isNew = !currentId;
      const sessionId = currentId ?? newId();
      const userMessage: Message = { id: newId(), role: "user", content };
      const history = [...(current?.messages ?? []), userMessage].map(({ role, content }) => ({
        role,
        content,
      }));

      setSessions((prev) => {
        const now = Date.now();
        if (isNew) {
          const session: ChatSession = {
            id: sessionId,
            title: titleFrom(content),
            createdAt: now,
            updatedAt: now,
            messages: [userMessage],
          };
          return [session, ...prev];
        }
        return prev.map((s) =>
          s.id === sessionId ? { ...s, updatedAt: now, messages: [...s.messages, userMessage] } : s,
        );
      });
      if (isNew) setCurrentId(sessionId);

      setIsLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;
      const start = performance.now();

      try {
        const result = await sendMessage(history, controller.signal);
        const durationMs = performance.now() - start;
        const assistantMessage: Message = {
          id: newId(),
          role: "assistant",
          content: result.content,
          durationMs,
        };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, updatedAt: Date.now(), messages: [...s.messages, assistantMessage] }
              : s,
          ),
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        toast.error("Couldn't fetch results", { description: message });
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [currentId, current, isLoading],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const newSession = useCallback(() => {
    abortRef.current?.abort();
    setCurrentId(null);
  }, []);

  const selectSession = useCallback((id: string) => setCurrentId(id), []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setCurrentId((cur) => (cur === id ? null : cur));
      toast.success("Chat deleted");
    },
    [],
  );

  return {
    sessions: ordered,
    currentId,
    messages,
    isLoading,
    send,
    stop,
    newSession,
    selectSession,
    deleteSession,
  };
}
