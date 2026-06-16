import { AnimatePresence, motion } from "framer-motion";
import { Menu, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { SessionList } from "@/components/chat/SessionList";
import { Button } from "@/components/ui/button";
import { useSessions } from "@/hooks/useSessions";

export default function App() {
  const s = useSessions();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelect = (id: string) => {
    s.selectSession(id);
    setDrawerOpen(false);
  };
  const handleNew = () => {
    s.newSession();
    setDrawerOpen(false);
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-border md:block">
        <SessionList
          sessions={s.sessions}
          currentId={s.currentId}
          onSelect={s.selectSession}
          onNew={s.newSession}
          onDelete={s.deleteSession}
        />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 w-72 max-w-[82%] border-r border-border bg-background pt-safe shadow-2xl"
            >
              <SessionList
                sessions={s.sessions}
                currentId={s.currentId}
                onSelect={handleSelect}
                onNew={handleNew}
                onDelete={s.deleteSession}
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 pt-safe backdrop-blur-lg">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Open chats"
                onClick={() => setDrawerOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground shadow-sm">
                <Sparkles className="h-[18px] w-[18px]" />
              </div>
              <div className="leading-tight">
                <h1 className="text-[15px] font-semibold tracking-tight">Charis</h1>
                <p className="hidden text-[11px] text-muted-foreground sm:block">
                  AI fashion agent · powered by Groq
                </p>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={handleNew} className="gap-1.5 rounded-lg">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New chat</span>
            </Button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col">
          <ChatPanel
            messages={s.messages}
            isLoading={s.isLoading}
            onSend={s.send}
            onStop={s.stop}
          />
        </main>
      </div>
    </div>
  );
}
