import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { Request, Response } from "express";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { AuthValidation } from "../src/validations/auth.validation.js";
import { TodoValidation } from "../src/validations/todo.validation.js";
import { createTodoSlug } from "../src/utils/todo-slug.js";

const owner = "11111111-1111-4111-8111-111111111111";
const otherOwner = "22222222-2222-4222-8222-222222222222";
const todoId = "33333333-3333-4333-8333-333333333333";
const req = { user: { id: owner } } as Request;
const res = {} as Response;
const dialect = new PgDialect();
let found: Record<string, unknown> | undefined;
let rows: unknown[] = [];
let resultRows: unknown[] = [{ id: todoId }];
let conditions: SQL[] = [];
let writes: Record<string, unknown>[] = [];
let countCondition: SQL | undefined;
let count = 0;
let operation = "";
let mutations: string[] = [];
let databaseUnavailable = false;

function chain() {
  const builder = {
    from: () => builder,
    innerJoin: () => builder,
    where: (condition: SQL) => {
      conditions.push(condition);
      return builder;
    },
    orderBy: () => builder,
    limit: async () => rows,
    values: (value: Record<string, unknown>) => {
      writes.push(value);
      return builder;
    },
    set: (value: Record<string, unknown>) => {
      writes.push(value);
      return builder;
    },
    returning: async () => resultRows,
    then: (resolve: (value: unknown[]) => unknown) =>
      Promise.resolve(resultRows).then(resolve)
  };
  return builder;
}
const fakeDb = {
  query: {
    todosTable: {
      findFirst: async ({ where }: { where: SQL }) => {
        conditions.push(where);
        return found;
      }
    }
  },
  select: () => chain(),
  insert: () => {
    operation = "insert";
    mutations.push(operation);
    return chain();
  },
  update: () => {
    operation = "update";
    mutations.push(operation);
    return chain();
  },
  delete: () => {
    operation = "delete";
    mutations.push(operation);
    return chain();
  },
  $count: async (_table: unknown, filter: SQL) => {
    countCondition = filter;
    return count;
  }
};
mock.module("../src/configs/db.js", () => ({
  default: fakeDb,
  pool: {
    query: async () => {
      if (databaseUnavailable) throw new Error("offline");
      return { rows: [{ value: 1 }] };
    }
  }
}));
const { TodoService } = await import("../src/services/todo.service.js");
const { validateSession } = await import("../src/utils/session.js");
const { readinessCheck } =
  await import("../src/controllers/health.controller.js");
const { TodoController } =
  await import("../src/controllers/todo.controller.js");

beforeEach(() => {
  found = undefined;
  rows = [];
  resultRows = [{ id: todoId }];
  conditions = [];
  writes = [];
  countCondition = undefined;
  count = 0;
  operation = "";
  mutations = [];
  databaseUnavailable = false;
});
afterAll(() => mock.restore());

function expectOwnedActive(condition: SQL) {
  const query = dialect.sqlToQuery(condition);
  expect(query.sql).toContain('"user_id"');
  expect(query.sql).toContain('"deleted_at" is null');
  expect(query.params).toContain(owner);
}

describe("input validation", () => {
  test("registration rejects empty names and weak passwords", () => {
    expect(
      AuthValidation.REGISTER.safeParse({
        name: "  ",
        email: "test@example.com",
        password: ""
      }).success
    ).toBe(false);
    expect(
      AuthValidation.REGISTER.safeParse({
        name: "Test",
        email: "test@example.com",
        password: "1234567"
      }).success
    ).toBe(false);
  });
  test("login preserves compatibility with nonempty legacy passwords", () => {
    expect(
      AuthValidation.LOGIN.safeParse({
        email: "test@example.com",
        password: "old"
      }).success
    ).toBe(true);
    expect(
      AuthValidation.LOGIN.safeParse({
        email: "test@example.com",
        password: ""
      }).success
    ).toBe(false);
  });
  test("create and update reject every internal field", () => {
    for (const key of [
      "id",
      "userId",
      "slug",
      "createdAt",
      "updatedAt",
      "deletedAt"
    ]) {
      expect(
        TodoValidation.CREATE.safeParse({ name: "Todo", [key]: owner }).success
      ).toBe(false);
      expect(
        TodoValidation.UPDATE.safeParse({ name: "Todo", [key]: owner }).success
      ).toBe(false);
    }
  });
  test("empty and unknown-only updates are rejected", () => {
    expect(TodoValidation.UPDATE.safeParse({}).success).toBe(false);
    expect(TodoValidation.UPDATE.safeParse({ unknown: true }).success).toBe(
      false
    );
  });
  test("ISO dates convert correctly and invalid dates are rejected", () => {
    expect(
      TodoValidation.CREATE.parse({
        name: "Todo",
        dueDate: "2026-12-01T09:00:00+08:00"
      }).dueDate
    ).toBeInstanceOf(Date);
    expect(
      TodoValidation.CREATE.safeParse({ name: "Todo", dueDate: "invalid" })
        .success
    ).toBe(false);
    expect(TodoValidation.UPDATE.parse({ dueDate: null }).dueDate).toBeNull();
  });
  test("malformed cursors fail validation", () => {
    expect(
      TodoValidation.QUERY.safeParse({ cursor: "not-a-uuid" }).success
    ).toBe(false);
  });
  test("duplicate titles have distinct slugs within the DB length limit", () => {
    const first = createTodoSlug("a".repeat(225));
    expect(first.length).toBeLessThanOrEqual(200);
    expect(first).not.toBe(createTodoSlug("a".repeat(225)));
    expect(createTodoSlug("你好")).toMatch(/^todo-/);
  });
});

describe("todo ownership and lifecycle", () => {
  test("detail lookups scope both ID and slug to the owner and active rows", async () => {
    for (const by of ["id", "slug"]) {
      found = { id: todoId, userId: owner };
      await TodoService.GET(req, { by, value: todoId });
      expectOwnedActive(conditions.at(-1)!);
    }
  });
  test("missing or inaccessible detail returns 404", async () => {
    await expect(
      TodoService.GET(req, { by: "id", value: todoId })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
  test("unauthenticated operations are refused before querying", async () => {
    await expect(
      TodoService.GET({} as Request, { by: "id", value: todoId })
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(conditions).toHaveLength(0);
  });
  test("updates use ownership and active-row constraints", async () => {
    await TodoService.UPDATE({ name: "Updated" }, owner, todoId);
    expectOwnedActive(conditions[0]);
    expect(writes[0].slug).toMatch(/^updated-/);
  });
  test("internal-field updates never reach database writes", async () => {
    await expect(
      TodoService.UPDATE({ userId: otherOwner }, owner, todoId)
    ).rejects.toThrow();
    expect(writes).toHaveLength(0);
  });
  test("delete is a scoped soft delete", async () => {
    await TodoService.DELETE(todoId, owner);
    expect(operation).toBe("update");
    expectOwnedActive(conditions[0]);
    expect(writes[0].deletedAt).toBeInstanceOf(Date);
  });
  test("repeated delete or inaccessible update returns 404", async () => {
    resultRows = [];
    await expect(TodoService.DELETE(todoId, owner)).rejects.toMatchObject({
      statusCode: 404
    });
    await expect(
      TodoService.UPDATE({ archived: true }, owner, todoId)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
  test("list and count share filters and omit deleted rows", async () => {
    count = 4;
    const result = await TodoService.QUERY(req, res, {
      search: "demo",
      priority: "HIGH",
      status: "CHECK"
    });
    expect(result.totalData).toBe(4);
    expectOwnedActive(conditions[0]);
    expectOwnedActive(countCondition!);
    const query = dialect.sqlToQuery(countCondition!);
    expect(query.params).toEqual(
      expect.arrayContaining(["%demo%", "HIGH", "CHECK"])
    );
  });
  test("foreign, deleted or filter-mismatched cursors are rejected", async () => {
    await expect(
      TodoService.QUERY(req, res, { cursor: todoId })
    ).rejects.toMatchObject({ statusCode: 400 });
    expectOwnedActive(conditions[0]);
  });
  test("timestamp cursors preserve database precision instead of binding JavaScript dates", async () => {
    found = { id: todoId, userId: owner, createdAt: new Date() };
    await TodoService.QUERY(req, res, {
      cursor: todoId,
      sortBy: "created_at",
      orderBy: "asc"
    });
    const query = dialect.sqlToQuery(conditions.at(-1)!);
    expect(query.sql).toContain("select");
    expect(query.params).toContain(todoId);
    expect(query.params.some(value => value instanceof Date)).toBe(false);
    expectOwnedActive(conditions.at(-1)!);
  });
  test("pagination returns the last visible row as next cursor", async () => {
    rows = [{ id: todoId }, { id: owner }];
    const result = await TodoService.QUERY(req, res, { take: 1 });
    expect(result.data).toEqual([{ id: todoId }]);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(todoId);
  });
  test("GET and PATCH controllers return 200", async () => {
    found = { id: todoId };
    let statusCode = 0;
    const response = {
      status: (code: number) => {
        statusCode = code;
        return response;
      },
      json: () => response
    } as unknown as Response;
    const next = (error?: unknown) => {
      if (error) throw error;
    };
    await TodoController.GET(
      { ...req, query: { by: "id", value: todoId } } as unknown as Request,
      response,
      next
    );
    expect(statusCode).toBe(200);
    await TodoController.UPDATE(
      {
        ...req,
        params: { todoId },
        body: { archived: true }
      } as unknown as Request,
      response,
      next
    );
    expect(statusCode).toBe(200);
  });
});

describe("session renewal", () => {
  function session(days: number) {
    return {
      session: {
        id: "hash",
        expiresAt: new Date(Date.now() + days * 86400000)
      },
      user: { id: owner }
    };
  }
  test("fresh session does not write to the database", async () => {
    rows = [session(30)];
    const result = await validateSession("token");
    expect(result?.renewedExpiresAt).toBeNull();
    expect(mutations).toHaveLength(0);
  });
  test("session near expiry renews and returns the new expiry", async () => {
    rows = [session(10)];
    const result = await validateSession("token");
    expect(result?.renewedExpiresAt).toBeInstanceOf(Date);
    expect(result?.session.expiresAt).toEqual(result?.renewedExpiresAt);
    expect(mutations).toEqual(["update"]);
  });
  test("expired session is rejected and removed", async () => {
    rows = [session(-1)];
    expect(await validateSession("token")).toBeNull();
    expect(mutations).toEqual(["delete"]);
  });
});

test("readiness returns 503 when database cannot be reached", async () => {
  databaseUnavailable = true;
  let statusCode = 0;
  const response = {
    status: (code: number) => {
      statusCode = code;
      return response;
    },
    json: () => response
  } as unknown as Response;
  await readinessCheck(req, response);
  expect(statusCode).toBe(503);
});
