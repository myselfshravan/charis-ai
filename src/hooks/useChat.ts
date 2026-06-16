import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { sendMessage } from "@/lib/api";
import type { Message } from "@/types/chat";

function newId() {
  return crypto.randomUUID();
}

/**
 * Single source of truth for the chat. Components stay presentational and
 * call `send` / read `messages`, `isLoading`, `error`.
 */
export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isLoading) return;

      setError(null);
      const userMessage: Message = { id: newId(), role: "user", content };
      const history = [...messages, userMessage];
      setMessages(history);
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await sendMessage(
          history.map(({ role, content }) => ({ role, content })),
          controller.signal,
        );
        setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: result.content }]);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setError(message);
        toast.error("Couldn't fetch results", { description: message });
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, error, send, stop, reset };
}
