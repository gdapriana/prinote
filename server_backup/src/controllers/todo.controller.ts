import { CRUD_MESSAGE } from "../constants/response-message.js";
import { TodoService } from "../services/todo.service.js";
import { ApiResponse } from "../utils/api-response.js";
import type { NextFunction, Request, Response } from "express";

export class TodoController {
  static GET = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query;
      const result = await TodoService.GET(req, query);
      ApiResponse.ok(res, CRUD_MESSAGE.fetched("todo"), result);
    } catch (e) {
      next(e);
    }
  };
  static QUERY = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query;
      const result = await TodoService.QUERY(req, res, query);
      ApiResponse.Success(res, CRUD_MESSAGE.fetched("todo"), result);
    } catch (e) {
      next(e);
    }
  };
  static CREATE = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as unknown;
      const result = await TodoService.CREATE(req, res, body);
      ApiResponse.created(res, CRUD_MESSAGE.created("todo"), result);
    } catch (e) {
      next(e);
    }
  };
  static UPDATE = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as unknown;
      const todoId = req.params.todoId as string | undefined;
      const userId = req.user?.id;
      const result = await TodoService.UPDATE(body, userId, todoId);
      ApiResponse.ok(res, CRUD_MESSAGE.updated("todo"), result);
    } catch (e) {
      next(e);
    }
  };
  static DELETE = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const todoId = req.params.todoId as string | undefined;
      const userId = req.user?.id;
      const result = await TodoService.DELETE(todoId, userId);
      ApiResponse.Success(res, CRUD_MESSAGE.deleted("todo"), result);
    } catch (e) {
      next(e);
    }
  };
}
