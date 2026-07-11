import { readFileSync, existsSync } from "fs";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { OwnershipError } from "./lib/ownership.js";
import path from "path";
import { fileURLToPath } from "url";
import { authRoutes } from "./routes/auth.js";
import { documentRoutes } from "./routes/documents.js";
import { goalRoutes } from "./routes/goals.js";
import { actionRoutes } from "./routes/actions.js";
import { connectionRoutes } from "./routes/connections.js";
import { aiRoutes } from "./routes/ai.js";
import { calendarRoutes } from "./routes/calendar.js";
import { fileRoutes } from "./routes/files.js";
import { searchRoutes } from "./routes/search.js";
import { kpiRoutes } from "./routes/kpis.js";
import { doListRoutes } from "./routes/do-list.js";
import { getEnv, isProduction } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";

// Load .env in development (cwd is server/ when running via workspace)
if (process.env.NODE_ENV !== "production") {
  const { config } = await import("dotenv");
  config({ path: path.resolve(process.cwd(), ".env") });
  config({ path: path.resolve(process.cwd(), "../.env") });
}

const env = getEnv();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = env.PORT;

const app = new Hono();

app.use("*", logger());

// CORS only when client runs on a separate origin (local dev)
if (env.CLIENT_URL !== env.APP_URL) {
  app.use(
    "/api/*",
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );
}

app.get("/api/health", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ ok: true, db: "connected", env: env.NODE_ENV });
  } catch {
    return c.json({ ok: false, db: "disconnected" }, 503);
  }
});

app.route("/api/auth", authRoutes);
app.route("/api/documents", documentRoutes);
app.route("/api/goals", goalRoutes);
app.route("/api/actions", actionRoutes);
app.route("/api/connections", connectionRoutes);
app.route("/api/ai", aiRoutes);
app.route("/api/calendar", calendarRoutes);
app.route("/api/files", fileRoutes);
app.route("/api/search", searchRoutes);
app.route("/api/kpis", kpiRoutes);
app.route("/api/do-list", doListRoutes);

app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json({ error: "Validation failed", details: err.flatten() }, 400);
  }
  if (err instanceof OwnershipError) {
    return c.json({ error: err.message }, 400);
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return c.json({ error: "Already exists" }, 409);
    if (err.code === "P2003") return c.json({ error: "Invalid reference" }, 400);
  }
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

// Serve Vite build in production (same origin, single port)
if (isProduction()) {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  const indexPath = path.join(clientDist, "index.html");

  if (!existsSync(indexPath)) {
    console.error(`Client build not found at ${indexPath}. Run: npm run build`);
    process.exit(1);
  }

  const indexHtml = readFileSync(indexPath, "utf-8");

  app.use("/*", serveStatic({ root: clientDist }));

  app.notFound((c) => {
    if (c.req.path.startsWith("/api/")) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.html(indexHtml);
  });
}

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on port ${info.port} (${env.NODE_ENV})`);
  if (isProduction()) {
    console.log(`Serving app at ${env.APP_URL}`);
  }
});

async function shutdown() {
  console.log("Shutting down…");
  await prisma.$disconnect();
  server.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
