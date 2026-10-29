import db from "@/configs/db";
import { sessionsTable, usersTable } from "@/drizzle";
import { eq } from "drizzle-orm";
import { CookieOptions, Response } from "express";
import rateLimit from "express-rate-limit";
import { createHash, randomBytes } from "node:crypto";

export const COOKIE_NAME = "session";
const DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 hari
const RENEW_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 15; // perpanjang jika sisa < 15 hari

const cookieBase: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/"
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function setSessionCookie(
  res: Response,
  token: string,
  expiresAt: Date
) {
  res.cookie(COOKIE_NAME, token, { ...cookieBase, expires: expiresAt });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, cookieBase);
}

export async function createSession(
  res: Response,
  userId: string,
  meta?: { userAgent?: string; ipAddress?: string }
) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DURATION_MS);
  await db.insert(sessionsTable).values({
    id: hashToken(token),
    userId,
    expiresAt,
    userAgent: meta?.userAgent,
    ipAddress: meta?.ipAddress
  });
  setSessionCookie(res, token, expiresAt);
}

export async function validateSession(token: string) {
  const id = hashToken(token);
  const [row] = await db
    .select({
      session: sessionsTable,
      user: {
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email
      }
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(eq(sessionsTable.id, id))
    .limit(1);

  if (!row) return null;

  if (row.session.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, id));
    return null;
  }

  let renewedExpiresAt: Date | null = null;
  if (row.session.expiresAt.getDate() - Date.now() < RENEW_THRESHOLD_MS) {
    renewedExpiresAt = new Date(Date.now() + DURATION_MS);
    await db
      .update(sessionsTable)
      .set({ expiresAt: renewedExpiresAt, lastUsedAt: new Date() })
      .where(eq(sessionsTable.id, id));
  }

  return { session: row.session, user: row.user, renewedExpiresAt };
}

export async function deleteSessionByToken(token: string) {
  await db.delete(sessionsTable).where(eq(sessionsTable.id, hashToken(token)));
}

export async function deleteAllUserSessions(userId: string) {
  await db.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
}
