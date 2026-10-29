import db from "../configs/db.js";
import { AUTH_MESSAGE } from "../constants/response-message.js";
import { STATUS_CODES } from "../constants/status-codes.js";
import {
  LoginResponse,
  MeResponse,
  RegisterResponse,
  usersTable
} from "../drizzle/index.js";
import { ApiError } from "../utils/api-error.js";
import {
  clearSessionCookie,
  COOKIE_NAME,
  createSession,
  deleteSessionByToken
} from "../utils/session.js";
import { AuthValidation } from "../validations/auth.validation.js";
import { hash, verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import z from "zod";

export class AuthService {
  static REGISTER = async (
    req: Request,
    res: Response,
    body: unknown
  ): Promise<RegisterResponse> => {
    const validatedBody = z.parse(AuthValidation.REGISTER, body);
    const { email, name, password } = validatedBody;
    const hashedPassword = await hash(password);
    const [user] = await db
      .insert(usersTable)
      .values({ email, name, hashedPassword })
      .onConflictDoNothing({ target: usersTable.email })
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email
      });
    if (!user)
      throw new ApiError(
        STATUS_CODES.CONFLICT,
        AUTH_MESSAGE.EMAIL_ALREADY_EXISTS
      );
    await createSession(res, user.id, {
      userAgent: req.get("user-agent"),
      ipAddress: req.ip
    });
    return user;
  };
  static LOGIN = async (
    req: Request,
    res: Response,
    body: unknown
  ): Promise<LoginResponse> => {
    const validatedBody = z.parse(AuthValidation.LOGIN, body);
    const { email, password } = validatedBody;
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email)
    });
    if (!user || !(await verify(user.hashedPassword, password))) {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        AUTH_MESSAGE.INVALID_CREDENTIALS
      );
    }
    await createSession(res, user.id, {
      userAgent: req.get("user-agent"),
      ipAddress: req.ip
    });
    return { name: user.name, email: user.email, id: user.id };
  };
  static LOGOUT = async (req: Request, res: Response) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) await deleteSessionByToken(token);
    clearSessionCookie(res);
  };
  static ME = async (req: Request): Promise<MeResponse | undefined> => {
    return req.user;
  };
}
