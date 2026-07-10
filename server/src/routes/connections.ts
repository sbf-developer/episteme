import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";
import { z } from "zod";

type Variables = { userId: string };

const connectionSchema = z.object({
  sourceType: z.enum(["DOCUMENT", "GOAL", "ACTION"]),
  sourceId: z.string(),
  targetType: z.enum(["DOCUMENT", "GOAL", "ACTION"]),
  targetId: z.string(),
  label: z.string().optional(),
});

export const connectionRoutes = new Hono<{ Variables: Variables }>();

connectionRoutes.use("*", requireAuth);

connectionRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const connections = await prisma.connection.findMany({ where: { userId } });
  return c.json(connections);
});

connectionRoutes.get("/graph", async (c) => {
  const userId = c.get("userId");

  const [documents, goals, actions, connections] = await Promise.all([
    prisma.document.findMany({
      where: { userId },
      select: { id: true, title: true, type: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: { not: "ARCHIVED" } },
      select: { id: true, title: true, status: true },
    }),
    prisma.action.findMany({
      where: { userId },
      select: { id: true, title: true, status: true },
    }),
    prisma.connection.findMany({ where: { userId } }),
  ]);

  const nodes = [
    ...documents.map((d) => ({
      id: `DOCUMENT:${d.id}`,
      label: d.title,
      type: "DOCUMENT" as const,
      subtype: d.type,
    })),
    ...goals.map((g) => ({
      id: `GOAL:${g.id}`,
      label: g.title,
      type: "GOAL" as const,
      subtype: g.status,
    })),
    ...actions.map((a) => ({
      id: `ACTION:${a.id}`,
      label: a.title,
      type: "ACTION" as const,
      subtype: a.status,
    })),
  ];

  const edges = connections.map((c) => ({
    id: c.id,
    source: `${c.sourceType}:${c.sourceId}`,
    target: `${c.targetType}:${c.targetId}`,
    label: c.label,
  }));

  return c.json({ nodes, edges });
});

connectionRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = connectionSchema.parse(await c.req.json());
  const connection = await prisma.connection.create({
    data: { userId, ...body },
  });
  return c.json(connection, 201);
});

connectionRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const existing = await prisma.connection.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await prisma.connection.delete({ where: { id: existing.id } });
  return c.json({ ok: true });
});
