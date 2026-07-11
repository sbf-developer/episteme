import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search, Send, Sparkles, Trash2, X, PanelLeft } from "lucide-react";
import { api, type AiMessage, type AiThreadListItem } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const NARROW_QUERY = "(max-width: 1023px)";

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
  const isNarrow = useMediaQuery(NARROW_QUERY);
  const [showThreads, setShowThreads] = useState(false);
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

  const activeTitle = threadId
    ? (threads.find((t) => t.id === threadId)?.title ?? "Chat")
    : "New chat";

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
    if (!isNarrow) setShowThreads(false);
  }, [isNarrow]);

  useEffect(() => {
    document.body.style.overflow = isNarrow && showThreads ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isNarrow, showThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const closeThreads = () => setShowThreads(false);

  const startNewChat = () => {
    setThreadId(undefined);
    setMessages([]);
    setInput("");
    if (isNarrow) closeThreads();
  };

  const openThread = async (id: string) => {
    if (id === threadId) {
      if (isNarrow) closeThreads();
      return;
    }
    const requestId = ++openRequestRef.current;
    setMessages([]);
    setLoadingThread(true);
    try {
      const thread = await api.ai.thread(id);
      if (requestId !== openRequestRef.current) return;
      setThreadId(thread.id);
      setMessages(thread.messages);
      if (isNarrow) closeThreads();
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

  const threadPanel = (
    <div
      className={`flex h-full min-h-0 w-[min(88vw,18rem)] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] lg:w-64 ${
        isNarrow
          ? `fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out ${
              showThreads ? "translate-x-0" : "-translate-x-full"
            }`
          : "relative translate-x-0"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-3 py-2.5 lg:hidden">
        <span className="text-sm font-medium">Chats</span>
        <button
          type="button"
          onClick={closeThreads}
          aria-label="Close chat history"
          className="rounded p-1.5 text-[var(--color-text-tertiary)] hover:bg-white/60"
        >
          <X size={16} />
        </button>
      </div>

      <div className="shrink-0 border-b border-[var(--color-border)] p-3">
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
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-2 pl-8 pr-7 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          {threadSearch && (
            <button
              type="button"
              onClick={() => setThreadSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
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
              className={`group mb-0.5 flex w-full items-start gap-1 rounded-[var(--radius-sm)] px-2.5 py-2.5 transition-colors ${
                threadId === t.id ? "bg-white shadow-sm" : "hover:bg-white/60"
              }`}
            >
              <button
                type="button"
                onClick={() => openThread(t.id)}
                className="min-w-0 flex-1 cursor-pointer text-left"
              >
                <div className="flex items-start justify-between gap-2">
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
                className="mt-0.5 shrink-0 rounded p-1 text-[var(--color-text-tertiary)] opacity-100 hover:text-red-600 lg:opacity-0 lg:group-hover:opacity-100"
                title="Delete chat"
                aria-label={`Delete ${t.title}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full min-h-0">
      {isNarrow && showThreads && (
        <button
          type="button"
          aria-label="Close chat history"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={closeThreads}
        />
      )}

      {threadPanel}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-[var(--color-border)] px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="flex items-center gap-2">
            {isNarrow && (
              <button
                type="button"
                onClick={() => setShowThreads(true)}
                aria-label="Open chat history"
                className="shrink-0 rounded p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-border-subtle)]"
              >
                <PanelLeft size={18} />
              </button>
            )}
            <Sparkles size={18} className="hidden shrink-0 text-[var(--color-accent)] sm:block" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold tracking-tight sm:text-base lg:text-lg">
                {activeTitle}
              </h2>
            </div>
            {isNarrow && (
              <Button
                variant="secondary"
                className="shrink-0 px-2.5 py-2"
                onClick={startNewChat}
                aria-label="New chat"
              >
                <Plus size={16} />
              </Button>
            )}
          </div>
          <p className="mt-1 hidden text-xs text-[var(--color-text-secondary)] sm:block">
            Context-aware help using your goals, KPIs, Do-list, calendar, notes, and documents.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-5">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            {messages.length === 0 && !sending && !loadingThread && (
              <div className="py-6 text-center sm:py-12">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Ask about your goals, get help planning, or connect ideas.
                </p>
                <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
                  {[
                    "What should I focus on this week?",
                    "Help me break down my top goal",
                    "What patterns do you see in my notes?",
                  ].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInput(s)}
                      className="shrink-0 rounded-full border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text)] sm:shrink"
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

            {!loadingThread &&
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[min(92%,36rem)] rounded-[var(--radius-lg)] px-3.5 py-2.5 text-sm leading-relaxed sm:px-4 sm:py-3 ${
                      msg.role === "USER"
                        ? "bg-[var(--color-accent)] text-white"
                        : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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
        </div>

        <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
          <div className="mx-auto flex w-full max-w-2xl gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask anything…"
              className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2.5 text-base outline-none focus:border-[var(--color-accent)] sm:px-4 sm:text-sm"
            />
            <Button
              variant="primary"
              className="shrink-0 px-3"
              onClick={send}
              disabled={sending || !input.trim()}
              aria-label="Send message"
            >
              <Send size={16} />
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
