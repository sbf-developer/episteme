import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";
import { buildSystemPrompt, chatWithDeepSeek, fetchUserContext } from "../lib/ai.js";
import { z } from "zod";

type Variables = { userId: string };

export const aiRoutes = new Hono<{ Variables: Variables }>();

aiRoutes.use("*", requireAuth);

aiRoutes.get("/threads", async (c) => {
  const userId = c.get("userId");
  const threads = await prisma.aiThread.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
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
  const body = z
    .object({
      message: z.string().min(1),
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

  const [context, history] = await Promise.all([
    fetchUserContext(userId),
    prisma.aiMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
  ]);

  const systemPrompt = buildSystemPrompt(context);
  const messages = history
    .filter((m) => m.role !== "SYSTEM")
    .map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant",
      content: m.content,
    }));

  const reply = await chatWithDeepSeek(systemPrompt, messages);

  const assistantMsg = await prisma.aiMessage.create({
    data: { threadId, role: "ASSISTANT", content: reply },
  });

  await prisma.aiThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  return c.json({ threadId, userMessage: userMsg, message: assistantMsg });
});
