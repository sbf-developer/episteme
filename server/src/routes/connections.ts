import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";
import { assertEntityOwned } from "../lib/ownership.js";
import { z } from "zod";

type Variables = { userId: string };

const connectionSchema = z.object({
  sourceType: z.enum(["DOCUMENT", "GOAL", "ACTION", "DO_ITEM", "CALENDAR_EVENT", "FILE"]),
  sourceId: z.string(),
  targetType: z.enum(["DOCUMENT", "GOAL", "ACTION", "DO_ITEM", "CALENDAR_EVENT", "FILE"]),
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

  const [documents, goals, doItems, events, files, connections, layouts] = await Promise.all([
    prisma.document.findMany({
      where: { userId },
      select: { id: true, title: true, type: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: { not: "ARCHIVED" } },
      select: { id: true, title: true, status: true },
    }),
    prisma.doItem.findMany({
      where: { userId, done: false },
      select: { id: true, title: true },
    }),
    prisma.calendarEvent.findMany({
      where: { userId },
      select: { id: true, title: true, startAt: true },
    }),
    prisma.fileUpload.findMany({
      where: { userId },
      select: { id: true, filename: true, mimeType: true },
    }),
    prisma.connection.findMany({ where: { userId } }),
    prisma.graphLayout.findMany({ where: { userId } }),
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
    ...doItems.map((d) => ({
      id: `DO_ITEM:${d.id}`,
      label: d.title,
      type: "DO_ITEM" as const,
      subtype: "todo",
    })),
    ...events.map((e) => ({
      id: `CALENDAR_EVENT:${e.id}`,
      label: e.title,
      type: "CALENDAR_EVENT" as const,
      subtype: e.startAt.toISOString().slice(0, 10),
    })),
    ...files.map((f) => ({
      id: `FILE:${f.id}`,
      label: f.filename,
      type: "FILE" as const,
      subtype: f.mimeType,
    })),
  ];

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = connections
    .map((c) => ({
      id: c.id,
      source: `${c.sourceType}:${c.sourceId}`,
      target: `${c.targetType}:${c.targetId}`,
      label: c.label,
    }))
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  const positions = Object.fromEntries(
    layouts.map((l) => [l.nodeKey, { x: l.x, y: l.y }])
  );

  return c.json({ nodes, edges, positions });
});

connectionRoutes.put("/layout", async (c) => {
  const userId = c.get("userId");
  const body = z
    .object({
      positions: z.array(
        z.object({
          nodeKey: z.string(),
          x: z.number(),
          y: z.number(),
        })
      ).max(500),
    })
    .parse(await c.req.json());

  await Promise.all(
    body.positions.map((p) =>
      prisma.graphLayout.upsert({
        where: { userId_nodeKey: { userId, nodeKey: p.nodeKey } },
        create: { userId, nodeKey: p.nodeKey, x: p.x, y: p.y },
        update: { x: p.x, y: p.y },
      })
    )
  );

  return c.json({ ok: true });
});

connectionRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = connectionSchema.parse(await c.req.json());
  await assertEntityOwned(userId, body.sourceType, body.sourceId);
  await assertEntityOwned(userId, body.targetType, body.targetId);
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
