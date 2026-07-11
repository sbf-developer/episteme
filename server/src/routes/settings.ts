import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";
import {
  DEFAULT_OVERVIEW_LAYOUT,
  normalizeOverviewLayout,
  overviewLayoutSchema,
} from "../lib/overview-layout.js";
import {
  DEFAULT_SIDEBAR_LAYOUT,
  normalizeSidebarLayout,
  sidebarLayoutSchema,
} from "../lib/sidebar-layout.js";
import {
  EXPORT_SECTIONS,
  buildExportPdf,
  buildExportZip,
  getExportPreview,
} from "../lib/export.js";

type Variables = { userId: string };

export const settingsRoutes = new Hono<{ Variables: Variables }>();

settingsRoutes.use("*", requireAuth);

const aiInstructionsSchema = z.object({
  instructions: z.string().max(2000),
});
settingsRoutes.get("/ai", async (c) => {
  const userId = c.get("userId");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { aiInstructions: true },
  });
  return c.json({ instructions: user.aiInstructions });
});

settingsRoutes.patch("/ai", async (c) => {
  const userId = c.get("userId");
  const body = aiInstructionsSchema.parse(await c.req.json());

  await prisma.user.update({
    where: { id: userId },
    data: { aiInstructions: body.instructions.trim() },
  });

  return c.json({ instructions: body.instructions.trim() });
});

settingsRoutes.get("/overview", async (c) => {
  const userId = c.get("userId");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { overviewLayout: true },
  });

  const layout = normalizeOverviewLayout(user.overviewLayout ?? DEFAULT_OVERVIEW_LAYOUT);
  return c.json(layout);
});

settingsRoutes.patch("/overview", async (c) => {
  const userId = c.get("userId");
  const body = overviewLayoutSchema.parse(await c.req.json());
  const layout = normalizeOverviewLayout(body);

  await prisma.user.update({
    where: { id: userId },
    data: { overviewLayout: layout },
  });

  return c.json(layout);
});

settingsRoutes.get("/sidebar", async (c) => {
  const userId = c.get("userId");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { sidebarLayout: true },
  });

  const layout = normalizeSidebarLayout(user.sidebarLayout ?? DEFAULT_SIDEBAR_LAYOUT);
  return c.json(layout);
});

settingsRoutes.patch("/sidebar", async (c) => {
  const userId = c.get("userId");
  const body = sidebarLayoutSchema.parse(await c.req.json());
  const layout = normalizeSidebarLayout(body);

  await prisma.user.update({
    where: { id: userId },
    data: { sidebarLayout: layout },
  });

  return c.json(layout);
});

settingsRoutes.post("/onboarding/complete", async (c) => {
  const userId = c.get("userId");
  const user = await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompletedAt: new Date() },
    select: { onboardingCompletedAt: true },
  });
  return c.json({
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
  });
});

const exportSchema = z.object({
  sections: z
    .array(z.enum(EXPORT_SECTIONS))
    .min(1, "Select at least one section to export"),
});

settingsRoutes.get("/export/preview", async (c) => {
  const userId = c.get("userId");
  const preview = await getExportPreview(userId);
  return c.json(preview);
});

settingsRoutes.post("/export", async (c) => {
  const userId = c.get("userId");
  const body = exportSchema.parse(await c.req.json());
  const { buffer, filename } = await buildExportZip(userId, body.sections);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
});

settingsRoutes.post("/export/pdf", async (c) => {
  const userId = c.get("userId");
  const body = exportSchema.parse(await c.req.json());
  const { buffer, filename } = await buildExportPdf(userId, body.sections);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
});
