import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";
import { validateDocumentParent } from "../lib/ownership.js";
import { z } from "zod";

type Variables = { userId: string };

const documentSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  type: z.enum(["NOTE", "OUTLINE", "PLAN"]).optional(),
  parentId: z.string().nullable().optional(),
});

export const documentRoutes = new Hono<{ Variables: Variables }>();

documentRoutes.use("*", requireAuth);

documentRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const type = c.req.query("type");
  const documents = await prisma.document.findMany({
    where: { userId, ...(type ? { type: type as "NOTE" | "OUTLINE" | "PLAN" } : {}) },
    orderBy: [{ updatedAt: "desc" }],
  });
  return c.json(documents);
});

documentRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const doc = await prisma.document.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!doc) return c.json({ error: "Not found" }, 404);
  return c.json(doc);
});

documentRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = documentSchema.parse(await c.req.json());
  await validateDocumentParent(userId, body.parentId);
  const doc = await prisma.document.create({
    data: { userId, ...body, content: body.content ?? "" },
  });
  return c.json(doc, 201);
});

documentRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const body = documentSchema.partial().parse(await c.req.json());
  const existing = await prisma.document.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  await validateDocumentParent(userId, body.parentId, existing.id);

  const doc = await prisma.document.update({
    where: { id: existing.id },
    data: body,
  });
  return c.json(doc);
});

documentRoutes.post("/:id/duplicate", async (c) => {
  const userId = c.get("userId");
  const existing = await prisma.document.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = z.object({ title: z.string().optional() }).parse(await c.req.json().catch(() => ({})));

  const doc = await prisma.document.create({
    data: {
      userId,
      title: body.title ?? `${existing.title} (copy)`,
      content: existing.content,
      type: existing.type,
      parentId: existing.parentId,
    },
  });
  return c.json(doc, 201);
});

documentRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const existing = await prisma.document.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await prisma.document.delete({ where: { id: existing.id } });
  return c.json({ ok: true });
});
