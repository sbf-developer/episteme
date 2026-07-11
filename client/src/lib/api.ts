const API_BASE = "/api";

import type { OverviewLayout } from "./overview";
import type { UserLocalContext } from "./local-time";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: isFormData
      ? options?.headers
      : { "Content-Type": "application/json", ...options?.headers },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    me: () => request<{ user: User | null }>("/auth/me"),
    logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
    googleUrl: () => `${API_BASE}/auth/google`,
  },
  documents: {
    list: (type?: string) =>
      request<Document[]>(`/documents${type ? `?type=${type}` : ""}`),
    get: (id: string) => request<Document>(`/documents/${id}`),
    create: (data: Partial<Document>) =>
      request<Document>("/documents", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Document>) =>
      request<Document>(`/documents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    duplicate: (id: string, title?: string) =>
      request<Document>(`/documents/${id}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/documents/${id}`, { method: "DELETE" }),
  },
  goals: {
    list: () => request<Goal[]>("/goals"),
    get: (id: string) => request<Goal>(`/goals/${id}`),
    create: (data: Partial<Goal>) =>
      request<Goal>("/goals", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Goal>) =>
      request<Goal>(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    reorder: (ids: string[]) =>
      request<{ ok: boolean }>("/goals/reorder", {
        method: "PUT",
        body: JSON.stringify({ ids }),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/goals/${id}`, { method: "DELETE" }),
  },
  actions: {
    list: (status?: string) =>
      request<Action[]>(`/actions${status ? `?status=${status}` : ""}`),
    create: (data: Partial<Action>) =>
      request<Action>("/actions", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Action>) =>
      request<Action>(`/actions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    reorder: (ids: string[], section: "active" | "done") =>
      request<{ ok: boolean }>("/actions/reorder", {
        method: "PUT",
        body: JSON.stringify({ ids, section }),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/actions/${id}`, { method: "DELETE" }),
  },
  connections: {
    list: () => request<Connection[]>("/connections"),
    graph: () => request<GraphData>("/connections/graph"),
    saveLayout: (positions: { nodeKey: string; x: number; y: number }[]) =>
      request<{ ok: boolean }>("/connections/layout", {
        method: "PUT",
        body: JSON.stringify({ positions }),
      }),
    create: (data: {
      sourceType: Connection["sourceType"];
      sourceId: string;
      targetType: Connection["targetType"];
      targetId: string;
      label?: string | null;
    }) =>
      request<Connection>("/connections", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/connections/${id}`, { method: "DELETE" }),
  },
  calendar: {
    list: (params?: { from?: string; to?: string; upcoming?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.from) q.set("from", params.from);
      if (params?.to) q.set("to", params.to);
      if (params?.upcoming) q.set("upcoming", "true");
      const qs = q.toString();
      return request<CalendarEvent[]>(`/calendar${qs ? `?${qs}` : ""}`);
    },
    create: (data: Partial<CalendarEvent>) =>
      request<CalendarEvent>("/calendar", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CalendarEvent>) =>
      request<CalendarEvent>(`/calendar/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/calendar/${id}`, { method: "DELETE" }),
  },
  files: {
    list: () => request<FileUpload[]>("/files"),
    get: (id: string) => request<FileUpload>(`/files/${id}`),
    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<FileUpload>("/files", { method: "POST", body: form });
    },
    delete: (id: string) =>
      request<{ ok: boolean }>(`/files/${id}`, { method: "DELETE" }),
  },
  ai: {
    threads: (q?: string) =>
      request<AiThreadListItem[]>(`/ai/threads${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    thread: (id: string) => request<AiThreadDetail>(`/ai/threads/${id}`),
    createThread: (title?: string) =>
      request<AiThreadListItem>("/ai/threads", { method: "POST", body: JSON.stringify({ title }) }),
    renameThread: (id: string, title: string) =>
      request<AiThreadListItem>(`/ai/threads/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      }),
    deleteThread: (id: string) =>
      request<{ ok: boolean }>(`/ai/threads/${id}`, { method: "DELETE" }),
    chat: (message: string, threadId?: string, localContext?: UserLocalContext) =>
      request<{ threadId: string; userMessage: AiMessage; message: AiMessage }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message, threadId, ...localContext }),
      }),
  },
  kpis: {
    list: () => request<Kpi[]>("/kpis"),
    get: (id: string) => request<Kpi>(`/kpis/${id}`),
    create: (data: Partial<Kpi>) =>
      request<Kpi>("/kpis", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Kpi>) =>
      request<Kpi>(`/kpis/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    reorder: (ids: string[]) =>
      request<{ ok: boolean }>("/kpis/reorder", {
        method: "PUT",
        body: JSON.stringify({ ids }),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/kpis/${id}`, { method: "DELETE" }),
  },
  doList: {
    list: (done?: boolean) =>
      request<DoItem[]>(`/do-list${done !== undefined ? `?done=${done}` : ""}`),
    get: (id: string) => request<DoItem>(`/do-list/${id}`),
    create: (data: Partial<DoItem>) =>
      request<DoItem>("/do-list", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<DoItem>) =>
      request<DoItem>(`/do-list/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    reorder: (ids: string[], done: boolean) =>
      request<{ ok: boolean }>("/do-list/reorder", {
        method: "PUT",
        body: JSON.stringify({ ids, done }),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/do-list/${id}`, { method: "DELETE" }),
  },
  search: (q: string) => request<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}`),
  settings: {
    getOverview: () => request<OverviewLayout>("/settings/overview"),
    updateOverview: (layout: OverviewLayout) =>
      request<OverviewLayout>("/settings/overview", {
        method: "PATCH",
        body: JSON.stringify(layout),
      }),
    getAi: () => request<{ instructions: string }>("/settings/ai"),
    updateAi: (instructions: string) =>
      request<{ instructions: string }>("/settings/ai", {
        method: "PATCH",
        body: JSON.stringify({ instructions }),
      }),
    completeOnboarding: () =>
      request<{ onboardingCompletedAt: string | null }>("/settings/onboarding/complete", {
        method: "POST",
      }),
  },
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  onboardingCompletedAt: string | null;
};

export type Document = {
  id: string;
  title: string;
  content: string;
  type: "NOTE" | "OUTLINE" | "PLAN";
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Goal = {
  id: string;
  title: string;
  description: string;
  status: "ACTIVE" | "COMPLETED" | "PAUSED" | "ARCHIVED";
  priority: number;
  position: number;
  targetDate: string | null;
  parentId: string | null;
  actions?: Action[];
};

export type Action = {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
  goalId: string | null;
  dueDate: string | null;
  position: number;
  goal?: { id: string; title: string };
};

export type Kpi = {
  id: string;
  title: string;
  description: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  goalId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type DoItem = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type Connection = {
  id: string;
  sourceType: "DOCUMENT" | "GOAL" | "ACTION" | "DO_ITEM" | "CALENDAR_EVENT" | "FILE";
  sourceId: string;
  targetType: "DOCUMENT" | "GOAL" | "ACTION" | "DO_ITEM" | "CALENDAR_EVENT" | "FILE";
  targetId: string;
  label: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  color: string | null;
  goalId: string | null;
  actionId: string | null;
};

export type FileUpload = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  extractedText: string;
  createdAt: string;
  updatedAt: string;
};

export type GraphNode = {
  id: string;
  label: string;
  type: "DOCUMENT" | "GOAL" | "ACTION" | "DO_ITEM" | "CALENDAR_EVENT" | "FILE";
  subtype: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string | null;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  positions?: Record<string, { x: number; y: number }>;
};

export type AiThreadListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: { content: string; role: "USER" | "ASSISTANT" | "SYSTEM"; createdAt: string }[];
};

export type AiThreadDetail = AiThreadListItem & {
  messages: AiMessage[];
};

export type AiMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
};

export type SearchResult = {
  id: string;
  type: "document" | "goal" | "event" | "file" | "kpi" | "do-item";
  title: string;
  subtitle: string;
  updatedAt: string;
};
