const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
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
    delete: (id: string) =>
      request<{ ok: boolean }>(`/actions/${id}`, { method: "DELETE" }),
  },
  connections: {
    list: () => request<Connection[]>("/connections"),
    graph: () => request<GraphData>("/connections/graph"),
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
  ai: {
    threads: () => request<AiThread[]>("/ai/threads"),
    thread: (id: string) => request<AiThread & { messages: AiMessage[] }>(`/ai/threads/${id}`),
    createThread: (title?: string) =>
      request<AiThread>("/ai/threads", { method: "POST", body: JSON.stringify({ title }) }),
    chat: (message: string, threadId?: string) =>
      request<{ threadId: string; userMessage: AiMessage; message: AiMessage }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message, threadId }),
      }),
  },
  search: (q: string) => request<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}`),
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
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
  goal?: { id: string; title: string };
};

export type Connection = {
  id: string;
  sourceType: "DOCUMENT" | "GOAL" | "ACTION";
  sourceId: string;
  targetType: "DOCUMENT" | "GOAL" | "ACTION";
  targetId: string;
  label: string | null;
};

export type GraphNode = {
  id: string;
  label: string;
  type: "DOCUMENT" | "GOAL" | "ACTION";
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
};

export type AiThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type AiMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
};

export type SearchResult = {
  id: string;
  type: "document" | "goal" | "action";
  title: string;
  subtitle: string;
  updatedAt: string;
};
