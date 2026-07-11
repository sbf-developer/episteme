import type {
  User,
  Goal,
  Action,
  Document,
  Connection,
  CalendarEvent,
  FileUpload,
  Kpi,
  DoItem,
  EntityType,
} from "@prisma/client";
import { getEnv } from "./env.js";

export type UserContext = {
  user: Pick<User, "id" | "email" | "name">;
  goals: Pick<
    Goal,
    "id" | "title" | "description" | "status" | "priority" | "targetDate" | "parentId"
  >[];
  kpis: Pick<
    Kpi,
    "id" | "title" | "description" | "currentValue" | "targetValue" | "unit" | "goalId"
  >[];
  doItems: Pick<DoItem, "id" | "title" | "description" | "done" | "dueDate">[];
  documents: Pick<Document, "id" | "title" | "content" | "type">[];
  connections: Pick<
    Connection,
    "id" | "sourceType" | "sourceId" | "targetType" | "targetId" | "label"
  >[];
  calendarEvents: Pick<
    CalendarEvent,
    "id" | "title" | "description" | "startAt" | "endAt" | "allDay" | "goalId" | "actionId"
  >[];
  fileUploads: Pick<FileUpload, "id" | "filename" | "extractedText" | "mimeType">[];
  legacyActions: Pick<Action, "id" | "title">[];
};

export type UserLocalContext = {
  timeZone: string;
  localDateTime: string;
};

export function parseUserLocalContext(
  timeZone?: string,
  localDateTime?: string
): UserLocalContext | undefined {
  const tz = timeZone?.trim();
  const when = localDateTime?.trim();
  if (!tz || !when) return undefined;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
  } catch {
    return undefined;
  }
  return { timeZone: tz.slice(0, 64), localDateTime: when.slice(0, 120) };
}

const ENTITY_LIMITS = {
  goals: 60,
  kpis: 40,
  doItems: 60,
  connections: 120,
  calendarEvents: 50,
} as const;

const CONTENT_LIMITS = {
  document: 8000,
  file: 8000,
} as const;

function formatProgress(current: number, target: number, unit: string) {
  const pct = target !== 0 ? Math.round((current / target) * 100) : 0;
  const unitSuffix = unit ? ` ${unit}` : "";
  return `${current}${unitSuffix} / ${target}${unitSuffix} (${pct}%)`;
}

function formatDate(iso: Date, timeZone?: string) {
  if (!timeZone) return iso.toISOString().slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(iso);
}

function formatDateTime(iso: Date, timeZone?: string) {
  if (!timeZone) return iso.toISOString().slice(0, 16);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(iso);
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function buildTitleMaps(ctx: UserContext) {
  const goals = new Map(ctx.goals.map((g) => [g.id, g.title]));
  const documents = new Map(ctx.documents.map((d) => [d.id, d.title]));
  const events = new Map(ctx.calendarEvents.map((e) => [e.id, e.title]));
  const files = new Map(ctx.fileUploads.map((f) => [f.id, f.filename]));

  const entityLabels = new Map<string, string>();
  for (const d of ctx.documents) entityLabels.set(`DOCUMENT:${d.id}`, d.title);
  for (const g of ctx.goals) entityLabels.set(`GOAL:${g.id}`, g.title);
  for (const d of ctx.doItems) entityLabels.set(`DO_ITEM:${d.id}`, d.title);
  for (const a of ctx.legacyActions) entityLabels.set(`ACTION:${a.id}`, a.title);
  for (const e of ctx.calendarEvents) entityLabels.set(`CALENDAR_EVENT:${e.id}`, e.title);
  for (const f of ctx.fileUploads) entityLabels.set(`FILE:${f.id}`, f.filename);

  return { goals, documents, events, files, entityLabels };
}

function resolveEntityLabel(
  type: EntityType,
  id: string,
  entityLabels: Map<string, string>
) {
  return entityLabels.get(`${type}:${id}`) ?? `${type} (${id.slice(0, 8)}…)`;
}

export function buildSystemPrompt(
  ctx: UserContext,
  aiInstructions?: string,
  localContext?: UserLocalContext
): string {
  const tz = localContext?.timeZone;
  const { goals: goalTitles, entityLabels } = buildTitleMaps(ctx);

  const goalsText =
    ctx.goals.length > 0
      ? ctx.goals
          .map((g) => {
            const parent = g.parentId ? goalTitles.get(g.parentId) : null;
            const parts = [
              `[${g.status}] ${g.title}`,
              g.description ? `: ${g.description}` : "",
              g.priority > 0 ? ` (priority: ${g.priority})` : "",
              g.targetDate ? ` (target: ${formatDate(g.targetDate, tz)})` : "",
              parent ? ` (under: ${parent})` : "",
            ];
            return `- ${parts.join("")}`;
          })
          .join("\n")
      : "No goals yet.";

  const kpisText =
    ctx.kpis.length > 0
      ? ctx.kpis
          .map((k) => {
            const goal = k.goalId ? goalTitles.get(k.goalId) : null;
            return `- ${k.title}: ${formatProgress(k.currentValue, k.targetValue, k.unit)}${k.description ? ` — ${k.description}` : ""}${goal ? ` (goal: ${goal})` : ""}`;
          })
          .join("\n")
      : "No KPIs tracked yet.";

  const doListText =
    ctx.doItems.length > 0
      ? ctx.doItems
          .map(
            (d) =>
              `- [${d.done ? "done" : "todo"}] ${d.title}${d.description ? `: ${d.description}` : ""}${d.dueDate ? ` (due: ${formatDate(d.dueDate, tz)})` : ""}`
          )
          .join("\n")
      : "Do-list is empty.";

  const notesText =
    ctx.documents.length > 0
      ? ctx.documents
          .map(
            (d) =>
              `- [${d.type}] ${d.title}: ${truncate(d.content, CONTENT_LIMITS.document)}`
          )
          .join("\n")
      : "No notes or documents yet.";

  const calendarText =
    ctx.calendarEvents.length > 0
      ? ctx.calendarEvents
          .map((e) => {
            const goal = e.goalId ? goalTitles.get(e.goalId) : null;
            const when = e.allDay
              ? formatDate(e.startAt, tz)
              : `${formatDateTime(e.startAt, tz)}${e.endAt ? ` → ${formatDateTime(e.endAt, tz)}` : ""}`;
            const links = [goal ? `goal: ${goal}` : null].filter(Boolean).join(", ");
            return `- ${e.title}${e.description ? `: ${e.description}` : ""} (${when}${links ? `; ${links}` : ""})`;
          })
          .join("\n")
      : "No calendar events.";

  const filesText =
    ctx.fileUploads.length > 0
      ? ctx.fileUploads
          .map(
            (f) =>
              `- ${f.filename} (${f.mimeType}): ${truncate(f.extractedText, CONTENT_LIMITS.file)}`
          )
          .join("\n")
      : "No uploaded files.";

  const connectionsText =
    ctx.connections.length > 0
      ? ctx.connections
          .map((c) => {
            const source = resolveEntityLabel(c.sourceType, c.sourceId, entityLabels);
            const target = resolveEntityLabel(c.targetType, c.targetId, entityLabels);
            return `- ${source} → ${target}${c.label ? ` (${c.label})` : ""}`;
          })
          .join("\n")
      : "No connections yet.";

  const localTimeText = localContext
    ? `

## User local time
- Time zone: ${localContext.timeZone}
- Local date and time now: ${localContext.localDateTime}

Treat this as the user's current "now" when interpreting today, this week, upcoming deadlines, and calendar events. Dates and times in the workspace context below are shown in this time zone when available.`
    : "";

  const personalInstructions =
    aiInstructions?.trim()
      ? `

## Personal instructions
Follow these preferences in every response:
${aiInstructions.trim()}`
      : "";

  return `You are the Dasein assistant helping ${ctx.user.name ?? ctx.user.email} plan, reflect, and stay on track.

You have read-only access to their full workspace:${localTimeText}

## Goals
${goalsText}

## KPIs
${kpisText}

## Do-list
${doListText}

## Notes & outlines
${notesText}

## Calendar
${calendarText}

## Uploaded files
${filesText}

## Knowledge graph connections
${connectionsText}

Use this context to:
- Clarify goals and break them into next steps
- Track KPIs and Do-list items together
- Spot links across notes, files, calendar, and the knowledge graph
- Suggest priorities based on deadlines and status

Be concise, practical, and thoughtful. Ask clarifying questions when needed.${personalInstructions}`;
}

export async function fetchUserContext(userId: string): Promise<UserContext> {
  const { prisma } = await import("./prisma.js");
  const now = new Date();
  const calendarFrom = new Date(now.getTime() - 14 * 86400000);
  const calendarTo = new Date(now.getTime() + 90 * 86400000);

  const [user, goals, kpis, doItems, documents, connections, calendarEvents, fileUploads] =
    await Promise.all([
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
          parentId: true,
        },
        orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
        take: ENTITY_LIMITS.goals,
      }),
      prisma.kpi.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          description: true,
          currentValue: true,
          targetValue: true,
          unit: true,
          goalId: true,
        },
        orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
        take: ENTITY_LIMITS.kpis,
      }),
      prisma.doItem.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          description: true,
          done: true,
          dueDate: true,
        },
        orderBy: [{ done: "asc" }, { position: "asc" }, { updatedAt: "desc" }],
        take: ENTITY_LIMITS.doItems,
      }),
      prisma.document.findMany({
        where: { userId },
        select: { id: true, title: true, content: true, type: true },
        orderBy: { updatedAt: "desc" },
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
        take: ENTITY_LIMITS.connections,
      }),
      prisma.calendarEvent.findMany({
        where: {
          userId,
          startAt: { gte: calendarFrom, lte: calendarTo },
        },
        select: {
          id: true,
          title: true,
          description: true,
          startAt: true,
          endAt: true,
          allDay: true,
          goalId: true,
          actionId: true,
        },
        orderBy: { startAt: "asc" },
        take: ENTITY_LIMITS.calendarEvents,
      }),
      prisma.fileUpload.findMany({
        where: { userId },
        select: { id: true, filename: true, extractedText: true, mimeType: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  const actionIds = [
    ...new Set(
      connections.flatMap((c) => {
        const ids: string[] = [];
        if (c.sourceType === "ACTION") ids.push(c.sourceId);
        if (c.targetType === "ACTION") ids.push(c.targetId);
        return ids;
      })
    ),
  ];

  const legacyActions =
    actionIds.length > 0
      ? await prisma.action.findMany({
          where: { userId, id: { in: actionIds } },
          select: { id: true, title: true },
        })
      : [];

  return {
    user,
    goals,
    kpis,
    doItems,
    documents,
    connections,
    calendarEvents,
    fileUploads,
    legacyActions,
  };
}

export async function chatWithDeepSeek(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const env = getEnv();

  if (!env.DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API key is not configured");
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
