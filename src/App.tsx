import { Sparkles } from "lucide-react";
import { ChatPanel } from "@/components/chat/ChatPanel";

export default function App() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 pt-safe backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2.5 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground shadow-sm">
            <Sparkles className="h-[18px] w-[18px]" />
          </div>
          <div className="leading-tight">
            <h1 className="text-[15px] font-semibold tracking-tight">Charis</h1>
            <p className="text-[11px] text-muted-foreground">AI fashion agent · powered by Groq</p>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <ChatPanel />
      </main>
    </div>
  );
}
