import { randomUUID } from "node:crypto";

export function createTodoSlug(name: string): string {
  const prefix =
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 163)
      .replace(/-$/g, "") || "todo";
  return `${prefix}-${randomUUID()}`;
}
