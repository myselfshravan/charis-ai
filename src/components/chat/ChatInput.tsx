import { ArrowUp, Square } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, onStop, isLoading }: ChatInputProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow up to ~6 lines.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || isLoading) return;
    onSend(text);
    setValue("");
  }

  return (
    <div className="border-t border-border/60 bg-background/80 pb-safe backdrop-blur-lg">
      <div className="mx-auto w-full max-w-3xl px-3 pt-3 sm:px-4">
        <div className="flex items-end gap-2 rounded-[1.4rem] border border-border bg-card p-1.5 shadow-sm transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
          <Textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask about products, prices, brands…"
            aria-label="Message"
          />
          {isLoading ? (
            <Button
              size="icon"
              variant="secondary"
              onClick={onStop}
              aria-label="Stop"
              className="h-10 w-10 shrink-0 rounded-full"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={submit}
              disabled={!value.trim()}
              aria-label="Send"
              className="h-10 w-10 shrink-0 rounded-full"
            >
              <ArrowUp className="h-[18px] w-[18px]" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 hidden text-center text-[11px] text-muted-foreground sm:block">
          Enter to send · Shift+Enter for a new line
        </p>
        <div className="h-2 sm:hidden" />
      </div>
    </div>
  );
}
