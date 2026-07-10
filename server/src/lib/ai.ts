import type { User, Goal, Action, Document, Connection } from "@prisma/client";
import { getEnv } from "./env.js";

export type UserContext = {
  user: Pick<User, "id" | "email" | "name">;
  goals: Pick<Goal, "id" | "title" | "description" | "status" | "priority" | "targetDate">[];
  actions: Pick<Action, "id" | "title" | "description" | "status" | "dueDate" | "goalId">[];
  documents: Pick<Document, "id" | "title" | "content" | "type">[];
  connections: Pick<Connection, "id" | "sourceType" | "sourceId" | "targetType" | "targetId" | "label">[];
};

export function buildSystemPrompt(ctx: UserContext): string {
  const goalsText =
    ctx.goals.length > 0
      ? ctx.goals
          .map(
            (g) =>
              `- [${g.status}] ${g.title}${g.description ? `: ${g.description}` : ""}${g.targetDate ? ` (target: ${g.targetDate.toISOString().slice(0, 10)})` : ""}`
          )
          .join("\n")
      : "No goals yet.";

  const actionsText =
    ctx.actions.length > 0
      ? ctx.actions
          .map(
            (a) =>
              `- [${a.status}] ${a.title}${a.description ? `: ${a.description}` : ""}${a.dueDate ? ` (due: ${a.dueDate.toISOString().slice(0, 10)})` : ""}`
          )
          .join("\n")
      : "No actions yet.";

  const notesText =
    ctx.documents.length > 0
      ? ctx.documents
          .slice(0, 20)
          .map((d) => `- [${d.type}] ${d.title}: ${d.content.slice(0, 300)}${d.content.length > 300 ? "…" : ""}`)
          .join("\n")
      : "No notes yet.";

  const connectionsText =
    ctx.connections.length > 0
      ? ctx.connections
          .map((c) => `- ${c.sourceType}:${c.sourceId} → ${c.targetType}:${c.targetId}${c.label ? ` (${c.label})` : ""}`)
          .join("\n")
      : "No connections yet.";

  return `You are a personal epistemology assistant helping ${ctx.user.name ?? ctx.user.email} plan, reflect, and succeed.

You have access to their current knowledge graph context:

## Goals
${goalsText}

## Actions / Tasks
${actionsText}

## Notes & Documents
${notesText}

## Connections
${connectionsText}

Help them:
- Clarify and refine goals
- Break goals into actionable steps
- Connect ideas and spot patterns
- Track progress and suggest next moves
- Think clearly about priorities and trade-offs

Be concise, practical, and thoughtful. Ask clarifying questions when needed.`;
}

export async function fetchUserContext(userId: string): Promise<UserContext> {
  const { prisma } = await import("./prisma.js");

  const [user, goals, actions, documents, connections] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        targetDate: true,
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 50,
    }),
    prisma.action.findMany({
      where: { userId, status: { not: "DONE" } },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        goalId: true,
      },
      orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
      take: 50,
    }),
    prisma.document.findMany({
      where: { userId },
      select: { id: true, title: true, content: true, type: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.connection.findMany({
      where: { userId },
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        targetType: true,
        targetId: true,
        label: true,
      },
      take: 100,
    }),
  ]);

  return { user, goals, actions, documents, connections };
}

export async function chatWithDeepSeek(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const env = getEnv();

  if (!env.DEEPSEEK_API_KEY) {
    return "DeepSeek API key is not configured. Add DEEPSEEK_API_KEY to your environment.";
  }

  const response = await fetch(`${env.DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  return data.choices[0]?.message?.content ?? "No response.";
}
