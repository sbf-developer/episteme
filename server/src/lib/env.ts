import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error("Environment validation failed:\n" + msg);
    process.exit(1);
  }
  cached = result.data;
  return cached;
}

export function isProduction() {
  return getEnv().NODE_ENV === "production";
}

export function cookieSecure(): boolean {
  const env = getEnv();
  if (env.COOKIE_SECURE) return true;
  return env.NODE_ENV === "production";
}

export function googleAuthConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}
