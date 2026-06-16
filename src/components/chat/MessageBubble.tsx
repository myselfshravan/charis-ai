import { motion } from "framer-motion";
import { Sparkles, User } from "lucide-react";
import { Markdown } from "@/components/chat/Markdown";
import { ProductGrid } from "@/components/chat/ProductGrid";
import { parseReply } from "@/lib/products";
import type { Message } from "@/types/chat";

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: "easeOut" as const },
};

export function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <motion.div {...fade} className="flex flex-row-reverse gap-2.5 sm:gap-3">
        <Avatar role="user" />
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-primary-foreground sm:max-w-[80%]">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  const { text, products } = parseReply(message.content);

  return (
    <motion.div {...fade} className="flex gap-2.5 sm:gap-3">
      <Avatar role="assistant" />
      <div className="min-w-0 flex-1 space-y-3">
        {text && (
          <div className="inline-block max-w-full rounded-2xl rounded-tl-md border border-border bg-card px-4 py-2.5 sm:max-w-[85%]">
            <Markdown content={text} />
          </div>
        )}
        {products.length > 0 && <ProductGrid products={products} />}
      </div>
    </motion.div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  const isUser = role === "user";
  return (
    <div
      className={
        isUser
          ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground"
      }
    >
      {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
    </div>
  );
}
