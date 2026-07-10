import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { api, type AiMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export function AiPage() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [
      ...m,
      {
        id: `temp-${Date.now()}`,
        role: "USER",
        content: userMsg,
        createdAt: new Date().toISOString(),
      },
    ]);
    setLoading(true);

    try {
      const { threadId: tid, userMessage, message } = await api.ai.chat(userMsg, threadId);
      setThreadId(tid);
      setMessages((m) => [
        ...m.filter((x) => !x.id.startsWith("temp-")),
        userMessage,
        message,
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: `err-${Date.now()}`,
          role: "ASSISTANT",
          content: err instanceof Error ? err.message : "Something went wrong",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <div className="border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--color-accent)]" />
          <h2 className="text-lg font-semibold tracking-tight">AI Assistant</h2>
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Context-aware help using your goals, actions, and notes.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Ask about your goals, get help planning, or connect ideas.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                "What should I focus on this week?",
                "Help me break down my top goal",
                "What patterns do you see in my notes?",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-[var(--radius-lg)] px-4 py-3 text-sm leading-relaxed ${
                msg.role === "USER"
                  ? "bg-[var(--color-accent)] text-white"
                  : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-text-tertiary)]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-text-tertiary)] [animation-delay:0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-text-tertiary)] [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[var(--color-border)] px-6 py-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask anything about your goals and plans…"
            className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <Button variant="primary" onClick={send} disabled={loading || !input.trim()}>
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
