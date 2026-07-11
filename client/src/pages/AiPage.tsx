import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search, Send, Trash2, X, PanelLeft, PanelLeftClose, SlidersHorizontal } from "lucide-react";
import { api, type AiMessage, type AiThreadListItem } from "@/lib/api";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const NARROW_QUERY = "(max-width: 1023px)";
const HISTORY_OPEN_KEY = "ai-history-open";

const SUGGESTIONS = [
  "What should I focus on this week?",
  "Help me break down my top goal",
  "What patterns do you see in my notes?",
];

const INSTRUCTION_PRESETS = [
  "Give me short, direct answers.",
  "Be detailed and thorough.",
  "Challenge my thinking — push back when needed.",
  "Use bullet points.",
  "Be warm and encouraging.",
  "Focus on actionable next steps only.",
];

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
  const [showThreads, setShowThreads] = useState(() => {
    if (typeof window === "undefined") return true;
    if (window.matchMedia(NARROW_QUERY).matches) return false;
    const saved = localStorage.getItem(HISTORY_OPEN_KEY);
    return saved === null ? true : saved === "true";
  });
  const [threads, setThreads] = useState<AiThreadListItem[]>([]);
  const [threadSearch, setThreadSearch] = useState("");
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [instructionsError, setInstructionsError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const openRequestRef = useRef(0);
  const sendRequestRef = useRef(0);
  const instructionsSaveGen = useRef(0);
  const hasAutoOpened = useRef(false);
  const wantsNewChat = useRef(false);
  const instructionsSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const instructionsRef = useRef(aiInstructions);
  instructionsRef.current = aiInstructions;

  const headerTitle = threadId
    ? (threads.find((t) => t.id === threadId)?.title ?? "Chat")
    : "Dasein";

  useEffect(() => {
    api.settings
      .getAi()
      .then(({ instructions }) => setAiInstructions(instructions))
      .catch(() => setAiInstructions(""));
  }, []);

  useEffect(() => {
    return () => clearTimeout(instructionsSaveTimer.current);
  }, []);

  const persistInstructions = useCallback((value: string) => {
    setAiInstructions(value);
    setInstructionsError(null);
    clearTimeout(instructionsSaveTimer.current);
    setSavingInstructions(true);
    instructionsSaveTimer.current = setTimeout(async () => {
      const gen = ++instructionsSaveGen.current;
      const valueToSave = instructionsRef.current;
      try {
        const { instructions } = await api.settings.updateAi(valueToSave);
        if (gen !== instructionsSaveGen.current) return;
        setAiInstructions(instructions);
      } catch (err) {
        if (gen !== instructionsSaveGen.current) return;
        setInstructionsError(err instanceof Error ? err.message : "Could not save instructions");
      } finally {
        if (gen === instructionsSaveGen.current) setSavingInstructions(false);
      }
    }, 500);
  }, []);

  const addPreset = (preset: string) => {
    const current = instructionsRef.current;
    const next = current.trim() ? `${current.trim()}\n${preset}` : preset;
    persistInstructions(next);
  };

  const loadThreads = useCallback(async (q?: string, options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoadingThreads(true);
      setThreadsError(null);
    }
    try {
      const list = await api.ai.threads(q);
      setThreads(list);
    } catch (err) {
      if (!options?.silent) {
        setThreadsError(err instanceof Error ? err.message : "Failed to load chats");
      }
    } finally {
      if (!options?.silent) setLoadingThreads(false);
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
    if (isNarrow) {
      setShowThreads(false);
    } else {
      const saved = localStorage.getItem(HISTORY_OPEN_KEY);
      setShowThreads(saved === null ? true : saved === "true");
    }
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

  const closeThreads = () => {
    setShowThreads(false);
    if (!isNarrow) localStorage.setItem(HISTORY_OPEN_KEY, "false");
  };
  const openThreads = () => {
    setShowThreads(true);
    if (!isNarrow) localStorage.setItem(HISTORY_OPEN_KEY, "true");
  };

  const startNewChat = () => {
    sendRequestRef.current += 1;
    openRequestRef.current += 1;
    wantsNewChat.current = true;
    setThreadId(undefined);
    setMessages([]);
    setInput("");
    if (isNarrow) closeThreads();
  };

  const openThread = useCallback(async (id: string) => {
    sendRequestRef.current += 1;
    wantsNewChat.current = false;
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
      if (wantsNewChat.current) return;
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
  }, [threadId, isNarrow]);

  useEffect(() => {
    if (hasAutoOpened.current || wantsNewChat.current || loadingThreads || threadSearch.trim()) return;
    if (threads.length === 0) {
      hasAutoOpened.current = true;
      return;
    }
    hasAutoOpened.current = true;
    void openThread(threads[0].id);
  }, [threads, loadingThreads, threadSearch, openThread]);

  const deleteThread = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      await api.ai.deleteThread(id);
      if (threadId === id) startNewChat();
      loadThreads(threadSearch || undefined, { silent: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete chat");
    }
  };

  const send = async () => {
    if (!input.trim() || sending) return;
    const requestId = ++sendRequestRef.current;
    const threadAtSend = threadId;
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
      const { threadId: tid, userMessage, message } = await api.ai.chat(userMsg, threadAtSend);
      if (requestId !== sendRequestRef.current) return;
      setThreadId(tid);
      setMessages((m) => [
        ...m.filter((x) => !x.id.startsWith("temp-")),
        userMessage,
        message,
      ]);
      loadThreads(threadSearch || undefined, { silent: true });
    } catch (err) {
      if (requestId !== sendRequestRef.current) return;
      setMessages((m) => [
        ...m.filter((x) => !x.id.startsWith("temp-")),
        {
          id: `err-${Date.now()}`,
          role: "ASSISTANT",
          content: err instanceof Error ? err.message : "Something went wrong",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      if (requestId === sendRequestRef.current) setSending(false);
    }
  };

  const threadPanel = showThreads ? (
    <div
      className={`flex h-full min-h-0 w-[min(88vw,18rem)] shrink-0 flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-sidebar)] lg:w-60 ${
        isNarrow
          ? "fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out translate-x-0"
          : "relative"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between px-3 py-3">
        <span className="text-xs font-medium text-[var(--color-text-tertiary)]">History</span>
        <button
          type="button"
          onClick={closeThreads}
          aria-label="Hide chat history"
          className="rounded-full p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-white/80 hover:text-[var(--color-text)]"
        >
          {isNarrow ? <X size={16} /> : <PanelLeftClose size={16} strokeWidth={1.75} />}
        </button>
      </div>

      <div className="shrink-0 space-y-2 px-3 pb-3">
        <button
          type="button"
          onClick={startNewChat}
          className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/70 hover:text-[var(--color-text)]"
        >
          <Plus size={15} strokeWidth={1.75} />
          New chat
        </button>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
          />
          <input
            value={threadSearch}
            onChange={(e) => setThreadSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-[var(--radius-md)] bg-white/50 py-2 pl-8 pr-7 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:bg-white/80"
          />
          {threadSearch && (
            <button
              type="button"
              onClick={() => setThreadSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        {loadingThreads ? (
          <p className="px-2 py-6 text-center text-xs text-[var(--color-text-tertiary)]">Loading…</p>
        ) : threadsError ? (
          <p className="px-2 py-6 text-center text-xs text-red-600">{threadsError}</p>
        ) : threads.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-[var(--color-text-tertiary)]">
            {threadSearch ? "No chats found" : "No conversations yet"}
          </p>
        ) : (
          threads.map((t) => (
            <div
              key={t.id}
              className={`group mb-0.5 flex w-full items-start gap-0.5 rounded-[var(--radius-md)] px-2 py-2 transition-colors ${
                threadId === t.id ? "bg-white/90" : "hover:bg-white/50"
              }`}
            >
              <button
                type="button"
                onClick={() => openThread(t.id)}
                className="min-w-0 flex-1 cursor-pointer text-left"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="line-clamp-1 flex-1 text-xs font-medium text-[var(--color-text)]">
                    {t.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">
                    {formatRelative(t.updatedAt)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--color-text-tertiary)]">
                  {threadPreview(t)}
                </p>
              </button>
              <button
                type="button"
                onClick={() => deleteThread(t.id)}
                className="shrink-0 rounded-full p-1 text-[var(--color-text-tertiary)] opacity-100 transition-colors hover:text-red-600 lg:opacity-0 lg:group-hover:opacity-100"
                title="Delete chat"
                aria-label={`Delete ${t.title}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative flex h-full min-h-0 bg-[var(--color-surface)]">
      {isNarrow && showThreads && (
        <button
          type="button"
          aria-label="Close chat history"
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] lg:hidden"
          onClick={closeThreads}
        />
      )}

      {threadPanel}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-1 px-3 py-3 sm:px-5">
          {!showThreads && (
            <button
              type="button"
              onClick={openThreads}
              aria-label="Show chat history"
              className="shrink-0 rounded-full p-2 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)]"
            >
              <PanelLeft size={17} strokeWidth={1.75} />
            </button>
          )}
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium tracking-tight text-[var(--color-text)]">
            {headerTitle}
          </h2>
          <button
            type="button"
            onClick={() => setShowPersonalize((v) => !v)}
            aria-label="Personalize AI"
            className={`relative shrink-0 rounded-full p-2 transition-colors ${
              showPersonalize
                ? "bg-[var(--color-text)] text-white"
                : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)]"
            }`}
          >
            <SlidersHorizontal size={17} strokeWidth={1.75} />
            {aiInstructions.trim() && !showPersonalize && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            )}
          </button>
          <button
            type="button"
            onClick={startNewChat}
            aria-label="New chat"
            className="shrink-0 rounded-full p-2 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)]"
          >
            <Plus size={17} strokeWidth={1.75} />
          </button>
        </header>

        {showPersonalize && (
          <div className="shrink-0 border-b border-[var(--color-border-subtle)] px-3 py-4 sm:px-5">
            <div className="mx-auto max-w-2xl">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                  Personal instructions
                </p>
                <span className={`text-[10px] ${instructionsError ? "text-red-600" : "text-[var(--color-text-tertiary)]"}`}>
                  {instructionsError
                    ? instructionsError
                    : savingInstructions
                      ? "Saving…"
                      : "Saved for all chats"}
                </span>
              </div>
              <textarea
                value={aiInstructions}
                onChange={(e) => persistInstructions(e.target.value)}
                placeholder="e.g. Give me short answers. Be direct. Don't use bullet points."
                rows={3}
                className="w-full resize-none rounded-xl bg-[var(--color-border-subtle)] px-3 py-2.5 text-sm leading-relaxed text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:ring-1 focus:ring-[var(--color-border)]"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {INSTRUCTION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addPreset(preset)}
                    className="rounded-full px-2.5 py-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)]"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 sm:px-5">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-2 sm:py-4">
            {messages.length === 0 && !sending && !loadingThread && !loadingThreads && (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24">
                <div className="flex flex-col items-center gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInput(s)}
                      className="text-sm text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingThread && (
              <div className="flex justify-center py-16">
                <div className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-[var(--color-border)] border-t-[var(--color-text-tertiary)]" />
              </div>
            )}

            {!loadingThread &&
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[min(90%,34rem)] text-sm leading-relaxed ${
                      msg.role === "USER"
                        ? "rounded-2xl bg-[var(--color-border-subtle)] px-4 py-2.5 text-[var(--color-text)]"
                        : "px-1 py-0.5 text-[var(--color-text)]"
                    }`}
                  >
                    {msg.role === "USER" ? (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    ) : (
                      <div className="break-words">
                        <ChatMarkdown content={msg.content} />
                      </div>
                    )}
                  </div>
                </div>
              ))}

            {sending && messages.length > 0 && (
              <div className="flex justify-start px-1">
                <div className="flex gap-1 py-2">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-[var(--color-text-tertiary)]" />
                  <span className="h-1 w-1 animate-pulse rounded-full bg-[var(--color-text-tertiary)] [animation-delay:0.2s]" />
                  <span className="h-1 w-1 animate-pulse rounded-full bg-[var(--color-text-tertiary)] [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <footer className="shrink-0 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-1 rounded-2xl bg-[var(--color-surface-elevated)] px-1 py-1 shadow-[0_0_0_1px_var(--color-border-subtle)]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Message…"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-[var(--color-text-tertiary)] sm:text-sm"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-border-subtle)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Send size={15} strokeWidth={1.75} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
