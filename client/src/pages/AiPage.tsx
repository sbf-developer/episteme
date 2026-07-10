import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search, Send, Sparkles, Trash2, X } from "lucide-react";
import { api, type AiMessage, type AiThreadListItem } from "@/lib/api";
import { Button } from "@/components/ui/Button";

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function threadPreview(thread: AiThreadListItem) {
  const last = thread.messages?.[0];
  if (!last) return "No messages yet";
  return last.content.slice(0, 80) + (last.content.length > 80 ? "…" : "");
}

export function AiPage() {
  const [threads, setThreads] = useState<AiThreadListItem[]>([]);
  const [threadSearch, setThreadSearch] = useState("");
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const openRequestRef = useRef(0);

  const loadThreads = useCallback(async (q?: string) => {
    setLoadingThreads(true);
    setThreadsError(null);
    try {
      const list = await api.ai.threads(q);
      setThreads(list);
    } catch (err) {
      setThreadsError(err instanceof Error ? err.message : "Failed to load chats");
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    if (!threadSearch.trim()) {
      loadThreads();
      return;
    }
    const timer = setTimeout(() => loadThreads(threadSearch), 300);
    return () => clearTimeout(timer);
  }, [threadSearch, loadThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const startNewChat = () => {
    setThreadId(undefined);
    setMessages([]);
    setInput("");
  };

  const openThread = async (id: string) => {
    if (id === threadId) return;
    const requestId = ++openRequestRef.current;
    setMessages([]);
    setLoadingThread(true);
    try {
      const thread = await api.ai.thread(id);
      if (requestId !== openRequestRef.current) return;
      setThreadId(thread.id);
      setMessages(thread.messages);
    } catch (err) {
      if (requestId !== openRequestRef.current) return;
      setMessages([
        {
          id: `err-${Date.now()}`,
          role: "ASSISTANT",
          content: err instanceof Error ? err.message : "Failed to load chat",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      if (requestId === openRequestRef.current) setLoadingThread(false);
    }
  };

  const deleteThread = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    await api.ai.deleteThread(id);
    if (threadId === id) startNewChat();
    loadThreads(threadSearch || undefined);
  };

  const send = async () => {
    if (!input.trim() || sending) return;
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
    setSending(true);

    try {
      const { threadId: tid, userMessage, message } = await api.ai.chat(userMsg, threadId);
      setThreadId(tid);
      setMessages((m) => [
        ...m.filter((x) => !x.id.startsWith("temp-")),
        userMessage,
        message,
      ]);
      loadThreads(threadSearch || undefined);
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
      setSending(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Thread history panel */}
      <div className="flex w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)]">
        <div className="border-b border-[var(--color-border)] p-3">
          <Button variant="primary" className="w-full" onClick={startNewChat}>
            <Plus size={16} />
            New chat
          </Button>
          <div className="relative mt-2">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
            />
            <input
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1.5 pl-8 pr-7 text-xs outline-none focus:border-[var(--color-accent)]"
            />
            {threadSearch && (
              <button
                onClick={() => setThreadSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingThreads ? (
            <p className="px-2 py-4 text-center text-xs text-[var(--color-text-tertiary)]">Loading…</p>
          ) : threadsError ? (
            <p className="px-2 py-4 text-center text-xs text-red-600">{threadsError}</p>
          ) : threads.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-[var(--color-text-tertiary)]">
              {threadSearch ? "No chats found" : "No conversations yet"}
            </p>
          ) : (
            threads.map((t) => (
              <div
                key={t.id}
                className={`group mb-0.5 flex w-full items-start gap-1 rounded-[var(--radius-sm)] px-2.5 py-2 transition-colors ${
                  threadId === t.id
                    ? "bg-white shadow-sm"
                    : "hover:bg-white/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => openThread(t.id)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="line-clamp-1 flex-1 text-xs font-medium text-[var(--color-text)]">
                      {t.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">
                      {formatRelative(t.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--color-text-tertiary)]">
                    {threadPreview(t)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => deleteThread(t.id)}
                  className="mt-0.5 shrink-0 rounded p-0.5 text-[var(--color-text-tertiary)] opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                  title="Delete chat"
                  aria-label={`Delete ${t.title}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--color-accent)]" />
            <h2 className="text-lg font-semibold tracking-tight">
              {threadId ? threads.find((t) => t.id === threadId)?.title ?? "Chat" : "New chat"}
            </h2>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Context-aware help using your goals, calendar, notes, and documents.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-auto px-6 py-6">
          {messages.length === 0 && !sending && !loadingThread && (
            <div className="mx-auto max-w-lg py-16 text-center">
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

          {loadingThread && (
            <div className="flex justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
            </div>
          )}

          {!loadingThread && messages.map((msg) => (
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

          {sending && messages.length > 0 && (
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
          <div className="mx-auto flex max-w-2xl gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask anything about your goals and plans…"
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
            />
            <Button variant="primary" onClick={send} disabled={sending || !input.trim()}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
