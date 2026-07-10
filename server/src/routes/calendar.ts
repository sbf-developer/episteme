import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";
import { validateActionRef, validateGoalRef } from "../lib/ownership.js";
import { z } from "zod";

type Variables = { userId: string };

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullable().optional(),
  allDay: z.boolean().optional(),
  color: z.string().nullable().optional(),
  goalId: z.string().nullable().optional(),
  actionId: z.string().nullable().optional(),
});

export const calendarRoutes = new Hono<{ Variables: Variables }>();

calendarRoutes.use("*", requireAuth);

calendarRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const upcoming = c.req.query("upcoming");

  const where: { userId: string; startAt?: { gte?: Date; lte?: Date } } = { userId };

  if (upcoming === "true") {
    where.startAt = { gte: new Date() };
  } else if (from || to) {
    where.startAt = {};
    if (from) where.startAt.gte = new Date(from);
    if (to) where.startAt.lte = new Date(to);
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startAt: "asc" },
    take: upcoming === "true" ? 20 : 200,
  });
  return c.json(events);
});

calendarRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const event = await prisma.calendarEvent.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!event) return c.json({ error: "Not found" }, 404);
  return c.json(event);
});

calendarRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = eventSchema.parse(await c.req.json());
  await validateGoalRef(userId, body.goalId);
  await validateActionRef(userId, body.actionId);
  const event = await prisma.calendarEvent.create({
    data: {
      userId,
      title: body.title,
      description: body.description ?? "",
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : null,
      allDay: body.allDay ?? false,
      color: body.color,
      goalId: body.goalId,
      actionId: body.actionId,
    },
  });
  return c.json(event, 201);
});

calendarRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const body = eventSchema.partial().parse(await c.req.json());
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  await validateGoalRef(userId, body.goalId);
  await validateActionRef(userId, body.actionId);

  const event = await prisma.calendarEvent.update({
    where: { id: existing.id },
    data: {
      ...body,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt === null ? null : body.endAt ? new Date(body.endAt) : undefined,
    },
  });
  return c.json(event);
});

calendarRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await prisma.calendarEvent.delete({ where: { id: existing.id } });
  return c.json({ ok: true });
});
