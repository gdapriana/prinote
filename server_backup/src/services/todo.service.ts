import db from "../configs/db.js";
import { AUTH_MESSAGE, CRUD_MESSAGE } from "../constants/response-message.js";
import {
  type TodoCreateResponse,
  type TodoDeleteResponse,
  type TodoGetResponse,
  type TodoQueryResponse,
  type TodoUpdateResponse,
  todosTable
} from "../drizzle/index.js";
import { ApiError } from "../utils/api-error.js";
import { createTodoSlug } from "../utils/todo-slug.js";
import { TodoValidation } from "../validations/todo.validation.js";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
  type SQL
} from "drizzle-orm";
import type { Request, Response } from "express";
import { isUuid } from "../validations/global.validation.js";

const SORT_COLUMN_KEY = {
  name: "name",
  created_at: "createdAt",
  updated_at: "updatedAt",
  priority: "priority",
  status: "status"
} as const;

export class TodoService {
  static GET = async (
    req: Request,
    query: unknown
  ): Promise<TodoGetResponse> => {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized(AUTH_MESSAGE.UNAUTHORIZED);
    const { by, value } = TodoValidation.GET.parse(query);
    if (by === "id" && !isUuid(value))
      throw ApiError.notFound(CRUD_MESSAGE.notFound("todo"));
    const todo = await db.query.todosTable.findFirst({
      where: and(
        eq(todosTable.userId, userId),
        isNull(todosTable.deletedAt),
        by === "slug" ? eq(todosTable.slug, value) : eq(todosTable.id, value)
      )
    });
    if (!todo) throw ApiError.notFound(CRUD_MESSAGE.notFound("todo"));
    return todo;
  };

  static QUERY = async (
    req: Request,
    _res: Response,
    query: unknown
  ): Promise<TodoQueryResponse> => {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized(AUTH_MESSAGE.UNAUTHORIZED);
    const { search, status, priority, take, sortBy, orderBy, cursor } =
      TodoValidation.QUERY.parse(query);
    const key = SORT_COLUMN_KEY[sortBy];
    const sortColumn = todosTable[key];
    const direction = orderBy === "asc" ? asc : desc;
    const filter = and(
      eq(todosTable.userId, userId),
      isNull(todosTable.deletedAt),
      search
        ? or(
            ilike(todosTable.name, `%${search}%`),
            ilike(todosTable.description, `%${search}%`)
          )
        : undefined,
      status ? eq(todosTable.status, status) : undefined,
      priority ? eq(todosTable.priority, priority) : undefined
    );
    let cursorCondition: SQL | undefined;
    if (cursor) {
      const cursorTodo = await db.query.todosTable.findFirst({
        where: and(filter, eq(todosTable.id, cursor))
      });
      if (!cursorTodo)
        throw ApiError.badRequest(
          "Cursor does not belong to the current todo results"
        );
      // Keep the cursor's original database precision (timestamps can include
      // microseconds that JavaScript Date would otherwise truncate).
      const cursorRow = sql`(select ${sortColumn}, ${todosTable.id} from ${todosTable} where ${todosTable.id} = ${cursor} and ${todosTable.userId} = ${userId} and ${todosTable.deletedAt} is null)`;
      cursorCondition =
        orderBy === "asc"
          ? sql`(${sortColumn}, ${todosTable.id}) > ${cursorRow}`
          : sql`(${sortColumn}, ${todosTable.id}) < ${cursorRow}`;
    }
    const [rows, totalData] = await Promise.all([
      db
        .select()
        .from(todosTable)
        .where(and(filter, cursorCondition))
        .orderBy(direction(sortColumn), direction(todosTable.id))
        .limit(take + 1),
      db.$count(todosTable, filter)
    ]);
    const hasMore = rows.length > take;
    const data = rows.slice(0, take);
    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      totalData
    };
  };

  static CREATE = async (
    req: Request,
    _res: Response,
    body: unknown
  ): Promise<TodoCreateResponse> => {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized(AUTH_MESSAGE.UNAUTHORIZED);
    const validatedBody = TodoValidation.CREATE.parse(body);
    const [todo] = await db
      .insert(todosTable)
      .values({
        ...validatedBody,
        userId,
        slug: createTodoSlug(validatedBody.name)
      })
      .returning({ id: todosTable.id });
    return todo;
  };

  static UPDATE = async (
    body: unknown,
    userId?: string,
    todoId?: string
  ): Promise<TodoUpdateResponse> => {
    if (!userId) throw ApiError.unauthorized(AUTH_MESSAGE.UNAUTHORIZED);
    if (!todoId || !isUuid(todoId))
      throw ApiError.notFound(CRUD_MESSAGE.notFound("todo"));
    const validatedBody = TodoValidation.UPDATE.parse(body);
    const [todo] = await db
      .update(todosTable)
      .set({
        ...validatedBody,
        slug: validatedBody.name
          ? createTodoSlug(validatedBody.name)
          : undefined
      })
      .where(
        and(
          eq(todosTable.userId, userId),
          eq(todosTable.id, todoId),
          isNull(todosTable.deletedAt)
        )
      )
      .returning({ id: todosTable.id });
    if (!todo) throw ApiError.notFound(CRUD_MESSAGE.notFound("todo"));
    return todo;
  };

  static DELETE = async (
    todoId?: string,
    userId?: string
  ): Promise<TodoDeleteResponse> => {
    if (!userId) throw ApiError.unauthorized(AUTH_MESSAGE.UNAUTHORIZED);
    if (!todoId || !isUuid(todoId))
      throw ApiError.notFound(CRUD_MESSAGE.notFound("todo"));
    const [todo] = await db
      .update(todosTable)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(todosTable.userId, userId),
          eq(todosTable.id, todoId),
          isNull(todosTable.deletedAt)
        )
      )
      .returning({ id: todosTable.id });
    if (!todo) throw ApiError.notFound(CRUD_MESSAGE.notFound("todo"));
    return todo;
  };
}
