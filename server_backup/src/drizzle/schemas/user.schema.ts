import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { todosTable } from "./todo.schema.js";
import { relations } from "drizzle-orm";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
});

export const sessionsTable = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    userAgent: text("user_agent"),
    ipAddress: text("ip_address")
  },
  t => [
    index("session_user_id_idx").on(t.userId),
    index("session_expires_at_idx").on(t.expiresAt)
  ]
);

export const usersTableRelations = relations(usersTable, ({ many }) => ({
  sessionsTable: many(sessionsTable),
  todosTable: many(todosTable)
}));

export const sessionsTableRelations = relations(sessionsTable, ({ one }) => ({
  usersTable: one(usersTable, {
    fields: [sessionsTable.userId],
    references: [usersTable.id]
  })
}));

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Session = typeof sessionsTable.$inferSelect;
export type NewSession = typeof sessionsTable.$inferInsert;

export type RegisterResponse = Pick<User, "name" | "email" | "id">;
export type LoginResponse = Pick<User, "name" | "email" | "id">;
export type LogoutResponse = Pick<User, "name">;
export type MeResponse = Pick<User, "name" | "email" | "id">;
