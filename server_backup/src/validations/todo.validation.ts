import { todoPriority, todoStatus } from "../drizzle/index.js";
import z from "zod";
import {
  deleteValidation,
  getValidation,
  queryValidation
} from "./global.validation.js";

const todoFields = z
  .object({
    name: z.string().trim().min(1).max(225),
    description: z.string().max(10000).nullable().optional(),
    archived: z.boolean().optional(),
    status: z.enum(todoStatus.enumValues).optional(),
    priority: z.enum(todoPriority.enumValues).optional(),
    dueDate: z
      .union([
        z.iso.datetime({ offset: true }).transform(value => new Date(value)),
        z.date()
      ])
      .nullable()
      .optional()
  })
  .strict();

export class TodoValidation {
  static QUERY = z.object({
    search: z.string().trim().min(1).max(1000).optional(),
    status: z.enum(todoStatus.enumValues).optional(),
    priority: z.enum(todoPriority.enumValues).optional(),
    ...queryValidation({
      sortEnum: ["name", "created_at", "updated_at", "priority", "status"]
    })
  });
  static GET = getValidation({ by: ["id", "slug"] });
  static CREATE = todoFields;
  static UPDATE = todoFields
    .partial()
    .refine(value => Object.values(value).some(field => field !== undefined), {
      message: "At least one todo field is required"
    });
  static DELETE = deleteValidation({ by: ["id"] });
}

export type TodoValidationQuery = z.infer<typeof TodoValidation.QUERY>;
export type TodoValidationCreate = z.infer<typeof TodoValidation.CREATE>;
export type TodoValidationUpdate = z.infer<typeof TodoValidation.UPDATE>;
export type TodoValidationGet = z.infer<typeof TodoValidation.GET>;
export type TodoValidationDelete = z.infer<typeof TodoValidation.DELETE>;
