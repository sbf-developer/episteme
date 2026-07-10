import { randomBytes } from "crypto";
import { Hono, type Context, type Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { prisma } from "../lib/prisma.js";
import {
  createSession,
  destroySession,
  getSessionUser,
  sessionCookieName,
  sessionCookieOptions,
} from "../lib/auth.js";
import { getEnv, googleAuthConfigured, cookieSecure } from "../lib/env.js";
type Variables = { userId: string };

const OAUTH_STATE_COOKIE = "pe_oauth_state";

export const authRoutes = new Hono<{ Variables: Variables }>();

authRoutes.get("/me", async (c) => {
  const user = await getSessionUser(getCookie(c, sessionCookieName()));
  if (!user) return c.json({ user: null });
  return c.json({
    user: { id: user.id, email: user.email, name: user.name, image: user.image },
  });
});

authRoutes.get("/google", (c) => {
  const env = getEnv();
  if (!googleAuthConfigured()) {
    return c.json({ error: "Google OAuth not configured" }, 500);
  }

  const state = randomBytes(32).toString("hex");
  const stateExpires = new Date(Date.now() + 10 * 60 * 1000);
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "Lax",
    path: "/",
    expires: stateExpires,
  });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${env.APP_URL}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

authRoutes.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const savedState = getCookie(c, OAUTH_STATE_COOKIE);
  const env = getEnv();

  deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });

  if (
    !code ||
    !googleAuthConfigured() ||
    !state ||
    !savedState ||
    state !== savedState
  ) {
    return c.redirect(`${env.CLIENT_URL}/login?error=auth_failed`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${env.APP_URL}/api/auth/google/callback`,      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) return c.redirect(`${env.CLIENT_URL}/login?error=token_failed`);
  const tokens = (await tokenRes.json()) as { access_token: string };
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) return c.redirect(`${env.CLIENT_URL}/login?error=profile_failed`);
  const profile = (await profileRes.json()) as {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };

  let user = await prisma.user.findUnique({ where: { email: profile.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        image: profile.picture,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name: profile.name, image: profile.picture },
    });
  }

  const { jwt, expiresAt } = await createSession(user.id);
  setCookie(c, sessionCookieName(), jwt, sessionCookieOptions(expiresAt));

  return c.redirect(env.CLIENT_URL);
});
authRoutes.post("/logout", async (c) => {
  await destroySession(getCookie(c, sessionCookieName()));
  deleteCookie(c, sessionCookieName(), { path: "/" });
  return c.json({ ok: true });
});

export async function requireAuth(c: Context<{ Variables: Variables }>, next: Next) {
  const user = await getSessionUser(getCookie(c, sessionCookieName()));
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  c.set("userId", user.id);
  await next();
}
