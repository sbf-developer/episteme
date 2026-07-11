import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";
import { buildSystemPrompt, chatWithDeepSeek, fetchUserContext } from "../lib/ai.js";
import { getEnv } from "../lib/env.js";
import { z } from "zod";

type Variables = { userId: string };

export const aiRoutes = new Hono<{ Variables: Variables }>();

aiRoutes.use("*", requireAuth);

aiRoutes.get("/threads", async (c) => {
  const userId = c.get("userId");
  const q = c.req.query("q")?.trim().slice(0, 200);

  const threads = await prisma.aiThread.findMany({
    where: {
      userId,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { messages: { some: { content: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { content: true, role: true, createdAt: true },
      },
    },
  });
  return c.json(threads);
});

aiRoutes.get("/threads/:id", async (c) => {
  const userId = c.get("userId");
  const thread = await prisma.aiThread.findFirst({
    where: { id: c.req.param("id"), userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!thread) return c.json({ error: "Not found" }, 404);
  return c.json(thread);
});

aiRoutes.post("/threads", async (c) => {
  const userId = c.get("userId");
  const body = z.object({ title: z.string().optional() }).parse(await c.req.json().catch(() => ({})));
  const thread = await prisma.aiThread.create({
    data: { userId, title: body.title ?? "New conversation" },
  });
  return c.json(thread, 201);
});

aiRoutes.post("/chat", async (c) => {
  const userId = c.get("userId");
  const env = getEnv();

  if (!env.DEEPSEEK_API_KEY) {
    return c.json({ error: "AI service is not configured" }, 503);
  }

  const body = z
    .object({
      message: z.string().min(1).max(8000),
      threadId: z.string().optional(),
    })
    .parse(await c.req.json());

  let threadId = body.threadId;
  if (!threadId) {
    const thread = await prisma.aiThread.create({
      data: { userId, title: body.message.slice(0, 60) },
    });
    threadId = thread.id;
  } else {
    const thread = await prisma.aiThread.findFirst({
      where: { id: threadId, userId },
    });
    if (!thread) return c.json({ error: "Thread not found" }, 404);
  }

  const userMsg = await prisma.aiMessage.create({
    data: { threadId, role: "USER", content: body.message },
  });

  const [context, historyRows, userSettings] = await Promise.all([
    fetchUserContext(userId),
    prisma.aiMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { aiInstructions: true },
    }),
  ]);

  const history = [...historyRows].reverse();

  const systemPrompt = buildSystemPrompt(
    context,
    userSettings?.aiInstructions?.trim() || undefined
  );
  const messages = history
    .filter((m) => m.role !== "SYSTEM")
    .map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant",
      content: m.content,
    }));

  let reply: string;
  try {
    reply = await chatWithDeepSeek(systemPrompt, messages);
  } catch {
    return c.json({ error: "AI service unavailable" }, 503);
  }

  const assistantMsg = await prisma.aiMessage.create({
    data: { threadId, role: "ASSISTANT", content: reply },
  });

  await prisma.aiThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  return c.json({ threadId, userMessage: userMsg, message: assistantMsg });
});

aiRoutes.patch("/threads/:id", async (c) => {
  const userId = c.get("userId");
  const body = z
    .object({ title: z.string().min(1).max(120) })
    .parse(await c.req.json());
  const existing = await prisma.aiThread.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  const thread = await prisma.aiThread.update({
    where: { id: existing.id },
    data: { title: body.title.trim() },
  });
  return c.json(thread);
});

aiRoutes.delete("/threads/:id", async (c) => {
  const userId = c.get("userId");
  const existing = await prisma.aiThread.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await prisma.aiThread.delete({ where: { id: existing.id } });
  return c.json({ ok: true });
});
