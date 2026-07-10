import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { prisma } from "./prisma.js";
import { cookieSecure } from "./env.js";
const SESSION_COOKIE = "pe_session";
const SESSION_DAYS = 30;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  return new TextEncoder().encode(secret);
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  const jwt = await new SignJWT({ token })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  return { jwt, expiresAt };
}

export async function getSessionUser(cookieValue: string | undefined) {
  if (!cookieValue) return null;

  try {
    const { payload } = await jwtVerify(cookieValue, getSecret());
    const token = payload.token as string;
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

export async function destroySession(cookieValue: string | undefined) {
  if (!cookieValue) return;
  try {
    const { payload } = await jwtVerify(cookieValue, getSecret());
    const token = payload.token as string;
    if (token) {
      await prisma.session.deleteMany({ where: { token } });
    }
  } catch {
    // ignore invalid tokens
  }
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "Lax" as const,
    path: "/",
    expires: expiresAt,
  };
}