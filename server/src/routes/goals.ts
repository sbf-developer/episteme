import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";
import { validateGoalParent } from "../lib/ownership.js";
import { reorderByIds } from "../lib/reorder.js";
import { z } from "zod";

type Variables = { userId: string };

const goalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "ARCHIVED"]).optional(),
  priority: z.number().optional(),
  position: z.number().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  parentId: z.string().nullable().optional(),
});

export const goalRoutes = new Hono<{ Variables: Variables }>();

goalRoutes.use("*", requireAuth);

goalRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const goals = await prisma.goal.findMany({
    where: { userId },
    include: { actions: { orderBy: { position: "asc" } } },
    orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
  });
  return c.json(goals);
});

goalRoutes.put("/reorder", async (c) => {
  const userId = c.get("userId");
  const body = z.object({ ids: z.array(z.string()).min(1) }).parse(await c.req.json());

  const existing = await prisma.goal.findMany({
    where: { userId, id: { in: body.ids } },
    select: { id: true },
  });
  if (existing.length !== body.ids.length) {
    return c.json({ error: "Invalid goal ids" }, 400);
  }

  await reorderByIds(body.ids, (id, position) =>
    prisma.goal.update({ where: { id }, data: { position } })
  );
  return c.json({ ok: true });
});

goalRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const goal = await prisma.goal.findFirst({
    where: { id: c.req.param("id"), userId },
    include: { actions: true, children: true },
  });
  if (!goal) return c.json({ error: "Not found" }, 404);
  return c.json(goal);
});

goalRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = goalSchema.parse(await c.req.json());
  await validateGoalParent(userId, body.parentId);
  const max = await prisma.goal.aggregate({
    where: { userId },
    _max: { position: true },
  });
  const goal = await prisma.goal.create({
    data: {
      userId,
      title: body.title,
      description: body.description ?? "",
      status: body.status,
      priority: body.priority,
      targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
      parentId: body.parentId,
      position: body.position ?? (max._max.position ?? -1) + 1,
    },
  });
  return c.json(goal, 201);
});

goalRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const body = goalSchema.partial().parse(await c.req.json());
  const existing = await prisma.goal.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  await validateGoalParent(userId, body.parentId, existing.id);

  const goal = await prisma.goal.update({
    where: { id: existing.id },
    data: {
      ...body,
      targetDate:
        body.targetDate === null ? null : body.targetDate ? new Date(body.targetDate) : undefined,
    },
  });
  return c.json(goal);
});

goalRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const existing = await prisma.goal.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await prisma.goal.delete({ where: { id: existing.id } });
  return c.json({ ok: true });
});
