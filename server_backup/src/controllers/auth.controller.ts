import { ApiResponse } from "../utils/api-response.js";
import type { NextFunction, Request, Response } from "express";
import type {
  LoginResponse,
  LogoutResponse,
  RegisterResponse,
  User
} from "../drizzle/index.js";
import { AuthService } from "../services/auth.service.js";
import { AUTH_MESSAGE, CRUD_MESSAGE } from "../constants/response-message.js";
import { STATUS_CODES } from "../constants/status-codes.js";

export class AuthController {
  static REGISTER = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as unknown;
      const result: RegisterResponse = await AuthService.REGISTER(
        req,
        res,
        body
      );
      ApiResponse.created(res, AUTH_MESSAGE.REGISTER_SUCCESS, result);
    } catch (e) {
      next(e);
    }
  };
  static LOGIN = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as unknown;
      const result: LoginResponse = await AuthService.LOGIN(req, res, body);
      ApiResponse.Success(res, AUTH_MESSAGE.LOGIN_SUCCESS, result);
    } catch (e) {
      next(e);
    }
  };
  static LOGOUT = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await AuthService.LOGOUT(req, res);
      ApiResponse.Success(
        res,
        AUTH_MESSAGE.LOGOUT_SUCCESS,
        undefined,
        STATUS_CODES.NO_CONTENT
      );
    } catch (e) {
      next(e);
    }
  };
  static ME = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AuthService.ME(req);
      ApiResponse.Success(
        res,
        CRUD_MESSAGE.fetched("user"),
        result,
        STATUS_CODES.OK
      );
    } catch (e) {
      next(e);
    }
  };
}
