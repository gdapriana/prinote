import db from "@/configs/db";
import { AUTH_MESSAGE, CRUD_MESSAGE } from "@/constants/response-message";
import { STATUS_CODES } from "@/constants/status-codes";
import {
  TodoCreateResponse,
  TodoDeleteResponse,
  TodoGetResponse,
  TodoQueryResponse,
  todosTable,
  TodoUpdateResponse,
  usersTable
} from "@/drizzle";
import { ApiError } from "@/utils/api-error";
import { TodoValidation } from "@/validations/todo.validation";
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  ilike,
  isNull,
  or,
  sql,
  SQL
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Request, Response } from "express";
import z from "zod";
import slugify from "slugify";
import { isUuid } from "@/validations/global.validation";

const SORT_COLUMN_KEY = {
  name: "name",
  created_at: "createdAt",
  updated_at: "updatedAt",
  priority: "priority",
  status: "status"
} as const;

export class TodoService {
  static GET = async (req: Request, query: any): Promise<TodoGetResponse> => {
    const userId = req.user?.id;
    if (!userId)
      throw new ApiError(STATUS_CODES.UNAUTHORIZED, AUTH_MESSAGE.UNAUTHORIZED);
    const validatedQuery = z.parse(TodoValidation.GET, query);
    const { by, value } = validatedQuery;

    if (by === "id") {
      if (!isUuid(value))
        throw ApiError.notFound(CRUD_MESSAGE.notFound("todo"));
    }

    const todo = await db.query.todosTable.findFirst({
      where:
        by === "slug" ? eq(todosTable.slug, value) : eq(todosTable.id, value)
    });
    if (!todo) throw ApiError.notFound(CRUD_MESSAGE.notFound("todo"));
    return todo;
  };
  static QUERY = async (
    req: Request,
    _res: Response,
    query: any
  ): Promise<TodoQueryResponse> => {
    const userId = req.user?.id;
    if (!userId)
      throw new ApiError(STATUS_CODES.UNAUTHORIZED, AUTH_MESSAGE.UNAUTHORIZED);
    const validatedQuery = z.parse(TodoValidation.QUERY, query);
    const { search, status, priority, take, sortBy, orderBy, cursor } =
      validatedQuery;

    const key = SORT_COLUMN_KEY[sortBy];
    const sortColumn = todosTable[key];
    const isAsc = orderBy === "asc";
    const direction = isAsc ? asc : desc;

    let cursorCondition: SQL | undefined;
    if (cursor) {
      const c = alias(todosTable, "cursor_todo");
      const cursorRow = db
        .select({ sortValue: c[key], id: c.id })
        .from(c)
        .where(eq(c.id, cursor));
      cursorCondition = isAsc
        ? sql`(${sortColumn}, ${todosTable.id}) > ${cursorRow}`
        : sql`(${sortColumn}, ${todosTable.id}) < ${cursorRow}`;
    }

    const [rows, totalData] = await Promise.all([
      db
        .select()
        .from(todosTable)
        .where(
          and(
            eq(todosTable.userId, userId),
            search
              ? or(
                  ilike(todosTable.name, `%${search}%`),
                  ilike(todosTable.description, `%${search}%`)
                )
              : undefined,
            status ? eq(todosTable.status, status) : undefined,
            priority ? eq(todosTable.priority, priority) : undefined,
            cursorCondition
          )
        )
        .orderBy(direction(sortColumn), direction(todosTable.id))
        .limit(take + 1),
      db.$count(todosTable, eq(todosTable.userId, userId))
    ]);

    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? data[data.length - 1].id : null;
    return { data, hasMore, nextCursor, totalData: totalData };
  };
  static CREATE = async (
    req: Request,
    res: Response,
    body: any
  ): Promise<TodoCreateResponse> => {
    const userId = req.user?.id;
    if (!userId)
      throw new ApiError(STATUS_CODES.UNAUTHORIZED, AUTH_MESSAGE.UNAUTHORIZED);

    const validatedBody = z.parse(TodoValidation.CREATE, {
      ...body,
      userId
    });

    let { slug, ...restValidatedBody } = validatedBody;
    slug = slugify(
      `${restValidatedBody.name}-${restValidatedBody.userId}-${new Date().getDate()}`
    );
    const [todo] = await db
      .insert(todosTable)
      .values({ slug, ...restValidatedBody })
      .returning({ id: todosTable.id });
    return todo;
  };

  static UPDATE = async (
    body: any,
    userId?: string,
    todoId?: string
  ): Promise<TodoUpdateResponse> => {
    if (!userId) throw ApiError.unauthorized(AUTH_MESSAGE.UNAUTHORIZED);

    if (!isUuid(todoId)) throw ApiError.notFound(CRUD_MESSAGE.notFound("todo"));

    const validatedBody = z.parse(TodoValidation.UPDATE, {
      ...body,
      userId
    });

    if (!Object.keys(validatedBody).length) throw ApiError.badRequest(CRUD_MESSAGE.updated('todo'));

    const [updatedTodo] = await db
      .update(todosTable)
      .set({ ...validatedBody, slug: validatedBody.name ? slugify(`${validatedBody.name}-${validatedBody.userId}-${new Date().getDate()}`) : undefined })
      .where(and(eq(todosTable.userId, userId), eq(todosTable.id, todoId!)))
      .returning({ id: todosTable.id });

    if (!updatedTodo) throw ApiError.notFound(CRUD_MESSAGE.notFound('todo'));
    return updatedTodo;
  };

  static DELETE = async (todoId?: string, userId?: string): Promise<TodoDeleteResponse> => {
    if (!userId) throw ApiError.unauthorized(AUTH_MESSAGE.UNAUTHORIZED);
    if (!isUuid(todoId)) throw ApiError.notFound(CRUD_MESSAGE.notFound("todo"));
    const [todo] = await db.delete(todosTable).where(
      and(
        eq(todosTable.userId, userId),
        eq(todosTable.id, todoId!)
      )
    ).returning({id: todosTable.id})
    if (!todo) throw ApiError.notFound(CRUD_MESSAGE.notFound('todo'))
    return todo;
  }
}
