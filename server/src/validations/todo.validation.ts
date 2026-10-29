import { todoPriority, todosTable, todoStatus } from "@/drizzle";
import z from "zod";
import {
  deleteValidation,
  getValidation,
  queryValidation
} from "./global.validation";
import { createInsertSchema } from "drizzle-zod";
import { createUpdateSchema } from "drizzle-zod";

export class TodoValidation {
  static QUERY = z.object({
    search: z.string().min(1).max(1000).optional(),
    status: z.enum(todoStatus.enumValues).optional(),
    priority: z.enum(todoPriority.enumValues).optional(),
    ...queryValidation({
      sortEnum: ["name", "created_at", "updated_at", "priority", "status"]
    })
  });
  static GET = getValidation({ by: ["id", "slug"] });
  static CREATE = createInsertSchema(todosTable, {
    userId: z.guid()
  });
  static UPDATE = createUpdateSchema(todosTable, {
    userId: z.guid()
  });
  static DELETE = deleteValidation({ by: ["id"] });
}

export type TodoValidationQuery = z.infer<typeof TodoValidation.QUERY>;
export type TodoValidationCreate = z.infer<typeof TodoValidation.CREATE>;
export type TodoValidationUpdate = z.infer<typeof TodoValidation.UPDATE>;
export type TodoValidationGet = z.infer<typeof TodoValidation.GET>;
export type TodoValidationDelete = z.infer<typeof TodoValidation.DELETE>;
