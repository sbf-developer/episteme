import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";

type Variables = { userId: string };

export const searchRoutes = new Hono<{ Variables: Variables }>();

searchRoutes.use("*", requireAuth);

searchRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const q = c.req.query("q")?.trim().slice(0, 200);
  if (!q) return c.json({ results: [] });

  const [documents, goals, actions, events, files] = await Promise.all([
    prisma.document.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, title: true, type: true, updatedAt: true },
    }),
    prisma.goal.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, title: true, status: true, updatedAt: true },
    }),
    prisma.action.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, title: true, status: true, updatedAt: true },
    }),
    prisma.calendarEvent.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, title: true, startAt: true, updatedAt: true },
    }),
    prisma.fileUpload.findMany({
      where: {
        userId,
        OR: [
          { filename: { contains: q, mode: "insensitive" } },
          { extractedText: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, filename: true, mimeType: true, updatedAt: true },
    }),
  ]);

  const results = [
    ...documents.map((d) => ({
      id: d.id,
      type: "document" as const,
      title: d.title,
      subtitle: d.type,
      updatedAt: d.updatedAt,
    })),
    ...goals.map((g) => ({
      id: g.id,
      type: "goal" as const,
      title: g.title,
      subtitle: g.status,
      updatedAt: g.updatedAt,
    })),
    ...actions.map((a) => ({
      id: a.id,
      type: "action" as const,
      title: a.title,
      subtitle: a.status,
      updatedAt: a.updatedAt,
    })),
    ...events.map((e) => ({
      id: e.id,
      type: "event" as const,
      title: e.title,
      subtitle: e.startAt.toISOString().slice(0, 10),
      updatedAt: e.updatedAt,
    })),
    ...files.map((f) => ({
      id: f.id,
      type: "file" as const,
      title: f.filename,
      subtitle: f.mimeType,
      updatedAt: f.updatedAt,
    })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return c.json({ results });
});
