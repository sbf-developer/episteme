import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";
import { reorderByIds } from "../lib/reorder.js";
import { removeEntityFromGraph } from "../lib/graph.js";
import { z } from "zod";

type Variables = { userId: string };

const doItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  done: z.boolean().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  position: z.number().optional(),
});

export const doListRoutes = new Hono<{ Variables: Variables }>();

doListRoutes.use("*", requireAuth);

doListRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const done = c.req.query("done");
  const items = await prisma.doItem.findMany({
    where: {
      userId,
      ...(done === "true" ? { done: true } : done === "false" ? { done: false } : {}),
    },
    orderBy: [{ done: "asc" }, { position: "asc" }, { updatedAt: "desc" }],
  });
  return c.json(items);
});

doListRoutes.put("/reorder", async (c) => {
  const userId = c.get("userId");
  const body = z
    .object({
      ids: z.array(z.string()).min(1),
      done: z.boolean(),
    })
    .parse(await c.req.json());

  const existing = await prisma.doItem.findMany({
    where: { userId, done: body.done, id: { in: body.ids } },
    select: { id: true },
  });
  if (existing.length !== body.ids.length) {
    return c.json({ error: "Invalid item ids" }, 400);
  }

  await reorderByIds(body.ids, (id, position) =>
    prisma.doItem.update({ where: { id }, data: { position } })
  );
  return c.json({ ok: true });
});

doListRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const item = await prisma.doItem.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json(item);
});

doListRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = doItemSchema.parse(await c.req.json());
  const done = body.done ?? false;
  const max = await prisma.doItem.aggregate({
    where: { userId, done },
    _max: { position: true },
  });
  const item = await prisma.doItem.create({
    data: {
      userId,
      title: body.title,
      description: body.description ?? "",
      done,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      position: body.position ?? (max._max.position ?? -1) + 1,
    },
  });
  return c.json(item, 201);
});

doListRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const body = doItemSchema.partial().parse(await c.req.json());
  const existing = await prisma.doItem.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.doItem.update({
      where: { id: existing.id },
      data: {
        ...body,
        dueDate:
          body.dueDate === null ? null : body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });

    if (!existing.done && updated.done) {
      await removeEntityFromGraph(userId, "DO_ITEM", updated.id, tx);
    }

    return updated;
  });

  return c.json(item);
});

doListRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const existing = await prisma.doItem.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await prisma.$transaction(async (tx) => {
    await removeEntityFromGraph(userId, "DO_ITEM", existing.id, tx);
    await tx.doItem.delete({ where: { id: existing.id } });
  });
  return c.json({ ok: true });
});
