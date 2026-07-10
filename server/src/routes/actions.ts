import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";
import { validateGoalRef } from "../lib/ownership.js";
import { z } from "zod";

type Variables = { userId: string };

const actionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).optional(),
  goalId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  position: z.number().optional(),
});

export const actionRoutes = new Hono<{ Variables: Variables }>();

actionRoutes.use("*", requireAuth);

actionRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const status = c.req.query("status");
  const actions = await prisma.action.findMany({
    where: {
      userId,
      ...(status ? { status: status as "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED" } : {}),
    },
    include: { goal: { select: { id: true, title: true } } },
    orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
  });
  return c.json(actions);
});

actionRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = actionSchema.parse(await c.req.json());
  await validateGoalRef(userId, body.goalId);
  const action = await prisma.action.create({
    data: {
      userId,
      title: body.title,
      description: body.description ?? "",
      status: body.status,
      goalId: body.goalId,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      position: body.position,
    },
  });
  return c.json(action, 201);
});

actionRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const body = actionSchema.partial().parse(await c.req.json());
  const existing = await prisma.action.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  await validateGoalRef(userId, body.goalId);

  const action = await prisma.action.update({
    where: { id: existing.id },
    data: {
      ...body,
      dueDate:
        body.dueDate === null ? null : body.dueDate ? new Date(body.dueDate) : undefined,
    },
  });
  return c.json(action);
});

actionRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const existing = await prisma.action.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await prisma.action.delete({ where: { id: existing.id } });
  return c.json({ ok: true });
});
