import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";
import { validateGoalRef } from "../lib/ownership.js";
import { z } from "zod";

type Variables = { userId: string };

const kpiSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  currentValue: z.number().optional(),
  targetValue: z.number(),
  unit: z.string().optional(),
  goalId: z.string().nullable().optional(),
  position: z.number().optional(),
});

export const kpiRoutes = new Hono<{ Variables: Variables }>();

kpiRoutes.use("*", requireAuth);

kpiRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const kpis = await prisma.kpi.findMany({
    where: { userId },
    orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
  });
  return c.json(kpis);
});

kpiRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const kpi = await prisma.kpi.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!kpi) return c.json({ error: "Not found" }, 404);
  return c.json(kpi);
});

kpiRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = kpiSchema.parse(await c.req.json());
  await validateGoalRef(userId, body.goalId);
  const kpi = await prisma.kpi.create({
    data: {
      userId,
      title: body.title,
      description: body.description ?? "",
      currentValue: body.currentValue ?? 0,
      targetValue: body.targetValue,
      unit: body.unit ?? "",
      goalId: body.goalId,
      position: body.position,
    },
  });
  return c.json(kpi, 201);
});

kpiRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const body = kpiSchema.partial().parse(await c.req.json());
  const existing = await prisma.kpi.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  await validateGoalRef(userId, body.goalId);

  const kpi = await prisma.kpi.update({
    where: { id: existing.id },
    data: body,
  });
  return c.json(kpi);
});

kpiRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const existing = await prisma.kpi.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await prisma.kpi.delete({ where: { id: existing.id } });
  return c.json({ ok: true });
});
