import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { useChat } from "@/hooks/useChat";

export function ChatPanel() {
  const { messages, isLoading, send, stop } = useChat();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1">
        <MessageList messages={messages} isLoading={isLoading} onSuggestion={send} />
      </div>
      <ChatInput onSend={send} onStop={stop} isLoading={isLoading} />
    </div>
  );
}
