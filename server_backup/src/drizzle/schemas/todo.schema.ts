import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { usersTable } from "./user.schema.js";
import { relations } from "drizzle-orm";

export const todoStatus = pgEnum("todo_status", [
  "CHECK",
  "UNCHECK",
  "PENDING"
]);
export const todoPriority = pgEnum("todo_priority", ["LOW", "MEDIUM", "HIGH"]);

export const todosTable = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    name: varchar("name", { length: 225 }).notNull(),
    slug: varchar("slug", { length: 200 }).unique(),
    description: text("description"),
    archived: boolean("archived").notNull().default(false),
    status: todoStatus("status").notNull().default("UNCHECK"),
    priority: todoPriority("priority").notNull().default("LOW"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  table => [
    index("todos_owner_created_idx").on(
      table.userId,
      table.deletedAt,
      table.createdAt,
      table.id
    ),
    index("todos_owner_name_idx").on(
      table.userId,
      table.deletedAt,
      table.name,
      table.id
    ),
    index("todos_owner_updated_idx").on(
      table.userId,
      table.deletedAt,
      table.updatedAt,
      table.id
    ),
    index("todos_owner_priority_idx").on(
      table.userId,
      table.deletedAt,
      table.priority,
      table.id
    ),
    index("todos_owner_status_idx").on(
      table.userId,
      table.deletedAt,
      table.status,
      table.id
    )
  ]
);

export const todosTableRelations = relations(todosTable, ({ one }) => ({
  usersTable: one(usersTable, {
    fields: [todosTable.userId],
    references: [usersTable.id]
  })
}));

export type TodoPriority = (typeof todoPriority.enumValues)[number];
export type TodoStatus = (typeof todoStatus.enumValues)[number];
export type Todo = typeof todosTable.$inferSelect;
export type NewTodo = typeof todosTable.$inferInsert;

export type TodoQueryResponse = {
  data: Todo[];
  nextCursor: string | null;
  hasMore: boolean;
  totalData?: number;
};
export type TodoGetResponse = Todo;
export type TodoCreateResponse = Pick<Todo, "id">;
export type TodoUpdateResponse = Pick<Todo, "id">;
export type TodoDeleteResponse = Pick<Todo, "id">;
