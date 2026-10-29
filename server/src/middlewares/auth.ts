import { STATUS_CODES } from "../constants/status-codes.js";
import type { Session } from "../drizzle/schemas/user.schema.js";
import {
  clearSessionCookie,
  COOKIE_NAME,
  setSessionCookie,
  validateSession
} from "../utils/session.js";
import { NextFunction, Request, Response } from "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; name: string; email: string };
    session?: Session;
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return next();
    if (typeof token !== "string" || token.length > 128) {
      clearSessionCookie(res);
      return next();
    }

    const result = await validateSession(token);
    if (!result) {
      clearSessionCookie(res);
      return next();
    }
    if (result.renewedExpiresAt) {
      setSessionCookie(res, token, result.renewedExpiresAt);
    }
    req.user = result.user;
    req.session = result.session;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user)
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      success: false,
      message: "UNAUTHORIZED",
      statusCode: STATUS_CODES.UNAUTHORIZED
    });
  next();
}
