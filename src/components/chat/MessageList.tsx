import { motion } from "framer-motion";
import { Flame, Shirt, Sparkles, TrendingDown } from "lucide-react";
import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/types/chat";

const SUGGESTIONS = [
  { icon: Shirt, text: "Black oversized t-shirts under ₹1500" },
  { icon: Flame, text: "What's trending from Snitch right now?" },
  { icon: Sparkles, text: "Best linen shirts for summer" },
  { icon: TrendingDown, text: "Biggest price drops this week" },
];

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onSuggestion: (text: string) => void;
}

export function MessageList({ messages, isLoading, onSuggestion }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return <EmptyState onSuggestion={onSuggestion} />;
  }

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-3 py-5 sm:gap-6 sm:px-5 sm:py-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} className="h-1" />
      </div>
    </ScrollArea>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col items-center justify-center px-5 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground shadow-lg shadow-primary/25"
      >
        <Sparkles className="h-8 w-8" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl"
      >
        Find your fit
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-2.5 max-w-sm text-sm text-muted-foreground sm:text-[15px]"
      >
        Your AI fashion agent. Discover products, compare prices and spot trends across brands.
      </motion.p>

      <div className="mt-8 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, text }, i) => (
          <motion.button
            key={text}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
            onClick={() => onSuggestion(text)}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3.5 text-left text-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-md hover:shadow-primary/5 active:translate-y-0"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-foreground/90">{text}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
