import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";
import {
  deleteStoredFile,
  extractText,
  isAllowedFile,
  saveUploadedFile,
} from "../lib/files.js";

type Variables = { userId: string };

export const fileRoutes = new Hono<{ Variables: Variables }>();

fileRoutes.use("*", requireAuth);

fileRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const files = await prisma.fileUpload.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      extractedText: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return c.json(files);
});

fileRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const file = await prisma.fileUpload.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!file) return c.json({ error: "Not found" }, 404);
  return c.json(file);
});

fileRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || typeof file === "string") {
    return c.json({ error: "No file provided" }, 400);
  }

  const blob = file as File;
  const filename = "name" in blob && blob.name ? blob.name : "upload.txt";
  const mimeType = blob.type || "text/plain";
  const buffer = Buffer.from(await blob.arrayBuffer());
  const check = isAllowedFile(filename, mimeType, buffer.length);
  if (!check.ok) return c.json({ error: check.error }, 400);

  const extractedText = await extractText(buffer, filename);
  const record = await prisma.fileUpload.create({
    data: {
      userId,
      filename,
      mimeType,
      size: buffer.length,
      storagePath: "",
      extractedText,
    },
  });

  const storagePath = await saveUploadedFile(userId, record.id, buffer);
  const updated = await prisma.fileUpload.update({
    where: { id: record.id },
    data: { storagePath },
  });

  return c.json(updated, 201);
});

fileRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const existing = await prisma.fileUpload.findFirst({
    where: { id: c.req.param("id"), userId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  await deleteStoredFile(existing.storagePath);
  await prisma.fileUpload.delete({ where: { id: existing.id } });
  return c.json({ ok: true });
});
